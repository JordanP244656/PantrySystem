from fastapi import APIRouter, HTTPException
import urllib.request
import json
import concurrent.futures

router = APIRouter()


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
    return {
        "barcode": barcode,
        "name": full_name,
        "brand": brand,
        "size": quantity,
        "category": category,
        "image_url": p.get("image_url") or p.get("image_front_url"),
        "source": "openfoodfacts",
    }


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
    brand = item.get("brand") or ""
    size = item.get("size") or ""
    category = item.get("category") or ""
    if not name:
        return None
    return {
        "barcode": barcode,
        "name": name,
        "brand": brand,
        "size": size,
        "category": category,
        "image_url": (item.get("images") or [None])[0],
        "source": "upcitemdb",
    }


@router.get("/upc/{barcode}")
def lookup_upc(barcode: str):
    result = None
    # Run both lookups in parallel, take whichever returns first with a result
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        futures = {
            executor.submit(_lookup_upcitemdb, barcode): "upcitemdb",
            executor.submit(_lookup_openfoodfacts, barcode): "off",
        }
        for future in concurrent.futures.as_completed(futures):
            try:
                data = future.result()
                if data and data.get("name"):
                    result = data
                    break
            except Exception:
                continue

    if not result:
        raise HTTPException(404, "Product not found in any database")
    return result
