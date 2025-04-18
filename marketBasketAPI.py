from fastapi import FastAPI

app = FastAPI()

stores, items, categories = [], [], []

# stores
@app.get("/stores")
def get_stores():
    return stores

@app.post("/stores")
def add_store(name: str):
    stores.append(name)
    return stores

@app.delete("/stores/{i}")
def delete_store(i: int):
    stores.pop(i)
    return stores

# items
@app.get("/items")
def get_items():
    return items

@app.post("/items")
def add_item(name: str, price: float, store: str, category: str):
    items.append({"name": name, "price": price, "store": store, "category": category})
    return items

@app.delete("/items/{i}")
def delete_item(i: int):
    items.pop(i)
    return items

# categories
@app.get("/categories")
def get_categories():
    return categories

@app.post("/categories")
def add_category(name: str, description: str = ""):
    categories.append({"name": name, "description": description})
    return categories

@app.delete("/categories/{i}")
def delete_category(i: int):
    categories.pop(i)
    return categories