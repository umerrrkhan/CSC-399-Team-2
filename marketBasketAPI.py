from fastapi import FastAPI

app = FastAPI()

groceryStore_list = []

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