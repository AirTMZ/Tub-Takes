import os
import json
import sys

def load_json_data(json_path):
    """Load the flavor data from JSON file"""
    try:
        with open(json_path, 'r', encoding='utf-8') as file:
            return json.load(file)
    except Exception as e:
        print(f"Error loading JSON file: {e}")
        sys.exit(1)

def is_image_file(filename):
    """Check if a file is an image based on its extension"""
    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
    return any(filename.lower().endswith(ext) for ext in image_extensions)

def validate_images():
    # Setup paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(base_dir, 'json', 'gfuel_flavors.json')
    images_dir = os.path.join(base_dir, 'images')

    # Ensure directories exist
    if not os.path.exists(json_path):
        print(f"Error: JSON file not found at {json_path}")
        return

    if not os.path.exists(images_dir):
        print(f"Error: Images directory not found at {images_dir}")
        return

    # Load flavor data
    flavors = load_json_data(json_path)
    print(f"Loaded {len(flavors)} flavors from JSON")

    # Get list of all image files in the images directory (filtering out non-image files)
    all_files = os.listdir(images_dir)
    image_files = {f for f in all_files if is_image_file(f)}
    print(f"Found {len(image_files)} image files in the images directory")

    # Track images that are referenced in the JSON
    referenced_images = set()

    # Check if each flavor has an image
    missing_images = []

    for flavor in flavors:
        if 'image' not in flavor or not flavor.get('name'):
            continue  # Skip entries without image or name

        image_filename = flavor.get('image')
        referenced_images.add(image_filename)

        if image_filename not in image_files:
            missing_images.append((flavor['name'], image_filename))

    # Check for extra images
    extra_images = image_files - referenced_images

    # Report findings
    if missing_images:
        print("\n=== MISSING IMAGES ===")
        print(f"Found {len(missing_images)} flavors with missing images:")
        for name, filename in missing_images:
            print(f" - {filename} (for '{name}')")
    else:
        print("\n✅ All flavors have their required images!")

    if extra_images:
        print("\n=== EXTRA IMAGES ===")
        print(f"Found {len(extra_images)} image files that are not referenced in the JSON:")
        for filename in sorted(extra_images):
            print(f" - {filename}")

        # Ask for confirmation to delete extra images
        if input("\nWould you like to delete these extra images? (yes/no): ").lower().strip() == "yes":
            deleted = 0
            for filename in extra_images:
                try:
                    os.remove(os.path.join(images_dir, filename))
                    print(f"Deleted: {filename}")
                    deleted += 1
                except Exception as e:
                    print(f"Error deleting {filename}: {e}")
            print(f"\nDeleted {deleted} out of {len(extra_images)} extra images")
        else:
            print("No images were deleted")
    else:
        print("\n✅ No extra image files found!")

if __name__ == "__main__":
    validate_images()