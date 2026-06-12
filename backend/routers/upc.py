from fastapi import APIRouter, HTTPException, Depends
import urllib.request
import json
import concurrent.futures
from sqlalchemy.orm import Session
from database import get_db
from models import UPCCache

router = APIRouter()

STORE_SEARCH_URLS = {
    "Costco": "https://www.costco.com/CatalogSearch?keyword={}",
    "Target": "https://www.target.com/s?searchTerm={}",
    "ShopRite": "https://www.shoprite.com/sm/planning/rsid/3000/results?query={}",
    "Walmart": "https://www.walmart.com/search?q={}",
    "Whole Foods": "https://www.wholefoodsmarket.com/search?text={}",
}


def _lookup_upcdatabase(barcode: str):
    url = f"https://upcdatabase.org/api/{barcode}"
    req = urllib.request.Request(url, headers={"User-Agent": "PantrySystem/1.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=4) as response:
        data = json.loads(response.read())
    if data.get("error") or not data.get("name"):
        return None
    return {"barcode": barcode, "name": data.get("name") or "", "brand": data.get("brand") or "", "size": data.get("size") or "", "category": data.get("category") or "", "image_url": None, "source": "upcdatabase"}


def _lookup_upcitemdb(barcode: str):
    url = f"https://api.upcitemdb.com/prod/trial/lookup?upc={barcode}"
    req = urllib.request.Request(url, headers={"User-Agent": "PantrySystem/1.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=4) as response:
        data = json.loads(response.read())
    items = data.get("items", [])
    if not items:
        return None
    item = items[0]
    name = item.get("title") or ""
    if not name:
        return None
    return {"barcode": barcode, "name": name, "brand": item.get("brand") or "", "size": item.get("size") or "", "category": item.get("category") or "", "image_url": (item.get("images") or [None])[0], "source": "upcitemdb"}


def _lookup_openfoodfacts(barcode: str):
    url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
    req = urllib.request.Request(url, headers={"User-Agent": "PantrySystem/1.0"})
    with urllib.request.urlopen(req, timeout=4) as response:
        data = json.loads(response.read())
    if data.get("status") != 1:
        return None
    p = data["product"]
    name = p.get("product_name") or p.get("product_name_en") or ""
    brand = p.get("brands") or ""
    quantity = p.get("quantity") or ""
    category = p.get("categories_tags", [""])[0].replace("en:", "").replace("-", " ").title() if p.get("categories_tags") else ""
    full_name = f"{brand} {name}".strip() if brand else name
    if not full_name:
        return None
    return {"barcode": barcode, "name": full_name, "brand": brand, "size": quantity, "category": category, "image_url": p.get("image_url") or p.get("image_front_url"), "source": "openfoodfacts"}


def _fetch_from_apis(barcode: str):
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = [
            executor.submit(_lookup_upcdatabase, barcode),
            executor.submit(_lookup_upcitemdb, barcode),
            executor.submit(_lookup_openfoodfacts, barcode),
        ]
        for future in concurrent.futures.as_completed(futures):
            try:
                data = future.result()
                if data and data.get("name"):
                    return data
            except Exception:
                continue
    return None


@router.get("/upc/{barcode}")
def lookup_upc(barcode: str, store: str = None, db: Session = Depends(get_db)):
    # Check cache first
    cached = db.query(UPCCache).filter(UPCCache.barcode == barcode).first()
    if cached:
        result = {"barcode": barcode, "name": cached.name, "brand": cached.brand, "size": cached.size, "category": cached.category, "image_url": cached.image_url, "source": cached.source, "cached": True}
    else:
        result = _fetch_from_apis(barcode)
        if not result:
            raise HTTPException(404, "Product not found")
        # Save to cache
        entry = UPCCache(barcode=barcode, name=result["name"], brand=result.get("brand"), size=result.get("size"), category=result.get("category"), image_url=result.get("image_url"), source=result.get("source"))
        db.add(entry)
        db.commit()
        result["cached"] = False

    # Add store purchase link
    if store and store in STORE_SEARCH_URLS:
        result["purchase_url"] = STORE_SEARCH_URLS[store].format(urllib.request.quote(result["name"]))
    else:
        result["purchase_url"] = None

    return result
