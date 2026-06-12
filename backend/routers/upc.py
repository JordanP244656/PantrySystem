from fastapi import APIRouter, HTTPException
import urllib.request
import json

router = APIRouter()

@router.get("/upc/{barcode}")
def lookup_upc(barcode: str):
    try:
        url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
        req = urllib.request.Request(url, headers={"User-Agent": "PantrySystem/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read())
        if data.get("status") != 1:
            raise HTTPException(404, "Product not found")
        product = data["product"]
        name = product.get("product_name") or product.get("product_name_en") or ""
        brand = product.get("brands") or ""
        quantity = product.get("quantity") or ""
        category = product.get("categories_tags", [""])[0].replace("en:", "").replace("-", " ").title() if product.get("categories_tags") else ""
        full_name = f"{brand} {name}".strip() if brand else name
        return {
            "barcode": barcode,
            "name": full_name,
            "brand": brand,
            "size": quantity,
            "category": category,
            "image_url": product.get("image_url") or product.get("image_front_url"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(503, f"Lookup failed: {str(e)}")
