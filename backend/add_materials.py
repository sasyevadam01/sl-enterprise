from database import SessionLocal
from models.production import ProductionMaterial

def add_materials():
    db = SessionLocal()
    try:
        # 1. Add "AIRSENSE CELESTINO CHIARO" (Memory)
        # Check if exists
        exists = db.query(ProductionMaterial).filter_by(label="AIRSENSE CELESTINO CHIARO").first()
        if not exists:
            print("Adding AIRSENSE CELESTINO CHIARO...")
            m1 = ProductionMaterial(
                category="memory",
                label="AIRSENSE CELESTINO CHIARO",
                value="#000000", # Black text requested -> So background should be light? User sent an image. 
                # User said: "AIRSENSE CELESTINO CHIARO SCRITTA DENTRO NERA". 
                # This implies a light background. "Celestino Chiaro" is light blue.
                # Let's pick a light blue hex code.
                display_order=100
            )
            # The 'value' field in DB is used for BACKGROUND color in frontend.
            # If I want black text, background must be light.
            # Light Blue: #E0F7FA (Cyan-50) or #B3E5FC (Light Blue-100)
            m1.value = "#E0FFFF" # LightCyan
            db.add(m1)
        else:
            print("AIRSENSE CELESTINO CHIARO already exists.")

        # 2. Add "GRIGIO" (Sponge Color)
        # "METTILO TRA ROSA E NERO"
        # Need to find display_order of Rosa and Nero.
        rosa = db.query(ProductionMaterial).filter(ProductionMaterial.label.ilike("%ROSA%")).first()
        nero = db.query(ProductionMaterial).filter(ProductionMaterial.label.ilike("%NERO%")).first()
        
        target_order = 50
        if rosa and nero:
            target_order = (rosa.display_order + nero.display_order) // 2
        elif rosa:
            target_order = rosa.display_order + 5
        
        exists_grey = db.query(ProductionMaterial).filter_by(label="GRIGIO", category="sponge_color").first()
        if not exists_grey:
            print("Adding GRIGIO...")
            m2 = ProductionMaterial(
                category="sponge_color",
                label="GRIGIO",
                value="#808080", # Gray
                display_order=target_order
            )
            db.add(m2)
        else:
            print("GRIGIO already exists.")

        db.commit()
        print("✅ Materials added successfully.")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_materials()
