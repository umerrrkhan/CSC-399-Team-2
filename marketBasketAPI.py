from fastapi import FastAPI

app = FastAPI()

groceryStore_list = []

grocery_items = []

# stores
@app.get("/stores")
async def get_strings():
    return {"Grocery Stores": groceryStore_list}

@app.post("/stores")
async def add_string(name: str = ""):
    groceryStore_list.append(name)
    return {"Grocery Stores": groceryStore_list}

@app.delete("/stores")
async def delete_string(index: int = 0):
    groceryStore_list.pop(index)
    return {"Grocery Stores": groceryStore_list}

# items
@app.get("/items")
async def get_items():
    return {"Items": grocery_items}

@app.post("/items")
async def add_item(name: str = "", price: float = 0.0, store: str = ""):
    grocery_items.append({"name": name, "price": price, "store": store})
    return {"Items": grocery_items}

@app.delete("/items")
async def delete_item(index: int = 0):
    grocery_items.pop(index)
    return {"Items": grocery_items}

# prices