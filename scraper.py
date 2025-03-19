import requests
from bs4 import BeautifulSoup
import json
import os
import re

# URL of the GFuel tubs collection page
url = 'https://gfuel.com/collections/all-tubs?filter.p.product_type=Tub&sort_by=title-ascending'

# Path to the JSON file in the json folder
json_file_path = os.path.join(os.path.dirname(__file__), 'json', 'gfuel_flavors.json')

# Directory to save images
image_dir = os.path.join(os.path.dirname(__file__), 'images')
os.makedirs(image_dir, exist_ok=True)

# Send a GET request to the URL
response = requests.get(url)
response.raise_for_status()  # Check if the request was successful

# Parse the HTML content
soup = BeautifulSoup(response.text, 'html.parser')

# Find all product items
products = soup.find_all('div', class_='grid-product__content')

# Load existing JSON data
try:
    with open(json_file_path, 'r', encoding='utf-8') as file:
        existing_data = json.load(file)
except (FileNotFoundError, json.JSONDecodeError):
    existing_data = []

# Extract product names and 1080p cover art links
new_products = []
for product in products:
    name_tag = product.find('div', class_='grid-product__title')
    if name_tag:
        name = name_tag.text.strip()
    else:
        continue

    img_tag = product.find('img', class_='lazyload')
    if img_tag and 'data-src' in img_tag.attrs:
        img_src = 'https:' + img_tag['data-src'].replace('{width}', '1080')

        # Extract the image ID from the URL (the v=XXXXXXXX part)
        image_id = None
        id_match = re.search(r'v=(\d+)', img_src)
        if id_match:
            image_id = id_match.group(1)
    else:
        continue

    # Generate the local image path
    img_filename = f"{name.replace(' ', '_')}.jpg"
    img_path = os.path.join(image_dir, img_filename)

    # Check if the image already exists
    if not os.path.exists(img_path):
        # Download the image
        img_response = requests.get(img_src)
        img_response.raise_for_status()
        with open(img_path, 'wb') as img_file:
            img_file.write(img_response.content)

    # Check if the product already exists in the JSON data
    product_exists = False
    for item in existing_data:
        if item['name'] == name:
            product_exists = True
            # Update the image ID if it's not present or has changed
            if image_id and item.get('image_id') != image_id:
                item['image_id'] = image_id
            break

    # If product doesn't exist, add it to new_products list
    if not product_exists:
        new_product = {
            'name': name,
            'image': img_filename
        }
        if image_id:
            new_product['image_id'] = image_id
        new_products.append(new_product)

# Add new products to the existing data
existing_data.extend(new_products)

# Save the updated JSON data back to the file
with open(json_file_path, 'w', encoding='utf-8') as file:
    json.dump(existing_data, file, indent=4, ensure_ascii=False)

print(f"Added {len(new_products)} new products to the JSON file.")
print(f"Updated image IDs for all products.")