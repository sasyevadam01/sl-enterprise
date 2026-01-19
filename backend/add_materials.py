from database import SessionLocal
from models.production import ProductionMaterial

def add_materials():
    db = SessionLocal()
    try:
        # 1. Add/Update "AIRSENSE" (Memory)
        # Check if exists (old or new name)
        existing = db.query(ProductionMaterial).filter(ProductionMaterial.label.like("AIRSENSE%")).first()
        
        if not existing:
            print("Adding AIRSENSE...")
            m1 = ProductionMaterial(
                category="memory",
                label="AIRSENSE",
                value="#81D4FA", # Darker Light Blue (requested "un pochino più scuro")
                display_order=100
            )
            db.add(m1)
        else:
            print(f"Updating existing material: {existing.label} -> AIRSENSE")
            existing.label = "AIRSENSE"
            existing.value = "#81D4FA" 

        # 2. Add "GRIGIO" (Sponge Color)
        # "METTILO TRA ROSA E NERO"
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
            # Ensure order is correct if re-running
            exists_grey.display_order = target_order

        db.commit()
        print("✅ Materials added successfully.")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_materials()
