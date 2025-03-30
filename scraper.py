import requests
from bs4 import BeautifulSoup
import json
import os
import re
import hashlib

# URL of the GFuel tubs collection page
url = 'https://gfuel.com/collections/all-tubs?filter.p.product_type=Tub&sort_by=title-ascending'

# Path to the JSON file in the json folder
json_file_path = os.path.join(os.path.dirname(__file__), 'json', 'gfuel_flavors.json')

# Directory to save images
image_dir = os.path.join(os.path.dirname(__file__), 'images')
os.makedirs(image_dir, exist_ok=True)

# Function to load existing JSON data
def load_json_data():
    try:
        with open(json_file_path, 'r', encoding='utf-8') as file:
            return json.load(file)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

# Function to save updated JSON data
def save_json_data(data):
    # Sort the data alphabetically by name
    data.sort(key=lambda x: x['name'])

    # Save the updated JSON data back to the file
    with open(json_file_path, 'w', encoding='utf-8') as file:
        json.dump(data, file, indent=4, ensure_ascii=False)

# Function to download image
def download_image(img_url, img_path):
    if not os.path.exists(img_path):
        img_response = requests.get(img_url)
        img_response.raise_for_status()
        with open(img_path, 'wb') as img_file:
            img_file.write(img_response.content)
        return True
    return False

# Function to generate a unique code based on the flavor name
def generate_flavor_code(name):
    # Use a hash of the name to generate a unique and consistent code
    return hashlib.md5(name.encode('utf-8')).hexdigest()[:8]

# Function to scrape a single product from a direct URL
def scrape_single_product(product_url):
    try:
        response = requests.get(product_url)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Extract product name - usually in title
        title_tag = soup.find('h1', class_='product-single__title')
        if title_tag:
            name = title_tag.text.strip()
            # If it's a collector's box, we want just the flavor name
            if "Collector's Box" in name or "Collectors Box" in name:
                name = name.split("Collector")[0].strip()
        else:
            # Try another approach if title not found
            meta_title = soup.find('meta', property='og:title')
            if meta_title:
                name = meta_title['content'].strip()
                # Clean up the name if it has "G FUEL|" prefix
                if name.startswith('G FUEL|'):
                    name = name.replace('G FUEL|', '').strip()
                # Remove "Tub" suffix if present
                if name.endswith('Tub'):
                    name = name.replace('Tub', '').strip()
                # Handle collector's box names
                if "Collector's Box" in name or "Collectors Box" in name:
                    name = name.split("Collector")[0].strip()
            else:
                print("Could not find product name.")
                return None

        # Find the product images
        found_img = False
        img_src = None
        image_id = None

        # First look for the specific tub image
        all_images = soup.find_all('img', class_='photoswipe__image')
        for img_tag in all_images:
            if img_tag.get('alt') and 'Tub' in img_tag.get('alt'):
                found_img = True

                if 'data-srcset' in img_tag.attrs:
                    srcset = img_tag['data-srcset']
                    # Find the 1080px version in the srcset
                    img_match = re.search(r'((?:https?:)?//[^"\s]+1080x[^"\s]+)', srcset)
                    if img_match:
                        img_src = img_match.group(1)
                        # Ensure URL has protocol
                        if img_src.startswith('//'):
                            img_src = 'https:' + img_src
                    else:
                        # Take the last (largest) image from srcset
                        img_parts = srcset.split(',')
                        img_src = img_parts[-1].strip().split(' ')[0]
                        # Ensure URL has protocol
                        if img_src.startswith('//'):
                            img_src = 'https:' + img_src
                elif 'srcset' in img_tag.attrs:
                    srcset = img_tag['srcset']
                    # Find the 1080px version in the srcset
                    img_match = re.search(r'((?:https?:)?//[^"\s]+1080x[^"\s]+)', srcset)
                    if img_match:
                        img_src = img_match.group(1)
                        # Ensure URL has protocol
                        if img_src.startswith('//'):
                            img_src = 'https:' + img_src
                    else:
                        # Take the last (largest) image from srcset
                        img_parts = srcset.split(',')
                        img_src = img_parts[-1].strip().split(' ')[0]
                        # Ensure URL has protocol
                        if img_src.startswith('//'):
                            img_src = 'https:' + img_src

                # Extract the image ID from the URL
                id_match = re.search(r'v=(\d+)', img_src)
                if id_match:
                    image_id = id_match.group(1)

                break

        # If we didn't find a specific tub image, use the first image
        if not found_img:
            img_tag = soup.find('img', class_='photoswipe__image')
            if img_tag:
                if 'data-srcset' in img_tag.attrs:
                    srcset = img_tag['data-srcset']
                    # Find the 1080px version in the srcset
                    img_match = re.search(r'((?:https?:)?//[^"\s]+1080x[^"\s]+)', srcset)
                    if img_match:
                        img_src = img_match.group(1)
                        # Ensure URL has protocol
                        if img_src.startswith('//'):
                            img_src = 'https:' + img_src
                    else:
                        # Take the last (largest) image from srcset
                        img_parts = srcset.split(',')
                        img_src = img_parts[-1].strip().split(' ')[0]
                        # Ensure URL has protocol
                        if img_src.startswith('//'):
                            img_src = 'https:' + img_src
                elif 'srcset' in img_tag.attrs:
                    srcset = img_tag['srcset']
                    # Find the 1080px version in the srcset
                    img_match = re.search(r'((?:https?:)?//[^"\s]+1080x[^"\s]+)', srcset)
                    if img_match:
                        img_src = img_match.group(1)
                        # Ensure URL has protocol
                        if img_src.startswith('//'):
                            img_src = 'https:' + img_src
                    else:
                        # Take the last (largest) image from srcset
                        img_parts = srcset.split(',')
                        img_src = img_parts[-1].strip().split(' ')[0]
                        # Ensure URL has protocol
                        if img_src.startswith('//'):
                            img_src = 'https:' + img_src
                elif 'data-src' in img_tag.attrs:
                    img_src = img_tag['data-src']
                    if not img_src.startswith('http'):
                        img_src = 'https:' + img_src
                    # Handle template URLs with {width}
                    img_src = img_src.replace('{width}', '1080')
                elif 'src' in img_tag.attrs:
                    img_src = img_tag['src']
                    if not img_src.startswith('http'):
                        img_src = 'https:' + img_src

                # Extract the image ID from the URL
                if img_src:
                    id_match = re.search(r'v=(\d+)', img_src)
                    if id_match:
                        image_id = id_match.group(1)

        if not img_src:
            print("Could not find product image.")
            return None

        # Generate image filename
        img_filename = f"{name.replace(' ', '_')}.jpg"
        img_path = os.path.join(image_dir, img_filename)

        # Download the image
        download_success = download_image(img_src, img_path)
        if download_success:
            print(f"Downloaded image: {img_src}")

        # Generate a unique code for the flavor
        flavor_code = generate_flavor_code(name)

        # Create product data
        product_data = {
            'name': name,
            'image': img_filename,
            'code': flavor_code  # Add the generated code
        }

        if image_id:
            product_data['image_id'] = image_id

        return product_data
    except Exception as e:
        print(f"Error scraping product: {e}")
        return None

# Main script for scraping all products from the collection page
def scrape_collection():
    # Send a GET request to the URL
    response = requests.get(url)
    response.raise_for_status()

    # Parse the HTML content
    soup = BeautifulSoup(response.text, 'html.parser')

    # Find all product items
    products = soup.find_all('div', class_='grid-product__content')

    # Load existing JSON data
    existing_data = load_json_data()

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

            # Extract the image ID from the URL
            image_id = None
            id_match = re.search(r'v=(\d+)', img_src)
            if id_match:
                image_id = id_match.group(1)
        else:
            continue

        # Generate the local image path
        img_filename = f"{name.replace(' ', '_')}.jpg"
        img_path = os.path.join(image_dir, img_filename)

        # Download the image
        downloaded = download_image(img_src, img_path)

        # Generate a unique code for the flavor
        flavor_code = generate_flavor_code(name)

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
                'image': img_filename,
                'code': flavor_code  # Add the generated code
            }
            if image_id:
                new_product['image_id'] = image_id
            new_products.append(new_product)

    # Add new products to the existing data
    existing_data.extend(new_products)

    # Save updated data
    save_json_data(existing_data)

    print(f"Added {len(new_products)} new products to the JSON file.")
    print(f"Updated image IDs for all products.")

    return existing_data

# Run the main scraper to get all products
print("Scraping all G FUEL tubs from collection page...")
existing_data = scrape_collection()

# Ask the user for a direct product URL
print("\nWould you like to add a specific G FUEL product?")
user_input = input("Please enter a G FUEL product URL or press Enter to skip: ")

if user_input.strip():
    print(f"Scraping product from: {user_input}")
    product_data = scrape_single_product(user_input)

    if product_data:
        # Check if the product already exists
        product_exists = False
        for item in existing_data:
            if item['name'] == product_data['name']:
                product_exists = True
                print(f"Product '{product_data['name']}' already exists in the database.")
                # Update image ID if needed
                if 'image_id' in product_data and item.get('image_id') != product_data['image_id']:
                    item['image_id'] = product_data['image_id']
                    print(f"Updated image ID for '{product_data['name']}'.")
                break

        if not product_exists:
            existing_data.append(product_data)
            save_json_data(existing_data)
            print(f"Added '{product_data['name']}' to the JSON file.")
    else:
        print("Failed to extract product information from the provided URL.")