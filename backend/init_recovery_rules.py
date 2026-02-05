"""
Script per popolare le regole di recupero nel database.
Basato sulla tabella "Magazzino Fogli/Longheroni/Memory" del 01/03/2025.
"""
from database import SessionLocal, engine
from models.production import ProductionMaterial, RecoveryRule
from models.base import Base

# Crea tabelle se non esistono
Base.metadata.create_all(bind=engine)

db = SessionLocal()

def get_or_create_material(category: str, label: str):
    """Trova un materiale esistente o restituisce None se non esiste."""
    material = db.query(ProductionMaterial).filter(
        ProductionMaterial.category == category,
        ProductionMaterial.label.ilike(f"%{label}%")
    ).first()
    return material

def add_recovery(category: str, material_label: str, thickness: float, product: str, notes: str = None):
    """Aggiunge una regola di recupero."""
    material = get_or_create_material(
        'sponge_density' if category == 'sponge' else 'memory',
        material_label
    )
    
    existing = db.query(RecoveryRule).filter(
        RecoveryRule.material_category == category,
        RecoveryRule.thickness_cm == thickness,
        RecoveryRule.product_type == product
    ).first()
    
    if existing:
        print(f"  [SKIP] {material_label} {thickness}cm -> {product} (già esiste)")
        return
    
    rule = RecoveryRule(
        material_category=category,
        material_id=material.id if material else None,
        thickness_cm=thickness,
        product_type=product,
        notes=notes,
        is_active=True,
        display_order=0
    )
    db.add(rule)
    print(f"  [ADD] {material_label} {thickness}cm -> {product}")

print("\n" + "="*60)
print("POPOLAMENTO REGOLE DI RECUPERO")
print("="*60)

# ============================================================
# SPUGNA
# ============================================================
print("\n📦 SPUGNA")

# D23/30 NERO
add_recovery('sponge', 'D23', 1.5, 'Materasso')
add_recovery('sponge', 'D30', 1.5, 'Materasso')

# D23 Celeste/Stock
add_recovery('sponge', 'D23', 1.5, 'Materasso')
add_recovery('sponge', 'D23', 3, 'Materasso')

# D25/D30 Verde
add_recovery('sponge', 'D25', 1.5, 'Materasso')
add_recovery('sponge', 'D30', 1.5, 'Materasso')

# D25 Giallo
add_recovery('sponge', 'D25', 1.5, 'Materasso')

# D25 Bianco
add_recovery('sponge', 'D25', 3, 'Ondina 7 zone', '3cm molle')
add_recovery('sponge', 'D25', 3, 'Materasso')

# D25 Grigio
add_recovery('sponge', 'D25', 3, 'Materasso')
add_recovery('sponge', 'D25', 4, 'Materasso')
add_recovery('sponge', 'D25', 7, 'Longheroni Bonnel', 'Sempre H14 x64/144/188')
add_recovery('sponge', 'D25', 9, 'Longheroni Insacchettati', 'Sempre H14 x63/143/193/203')
add_recovery('sponge', 'D25', 10, 'Longheroni Insacchettati', 'Sempre H14 x63/143/193/203')
add_recovery('sponge', 'D25', 14, 'Longheroni Insacchettati', 'Sempre H14 x63/143/193/203')

# D30 Rosa
add_recovery('sponge', 'D30', 3, 'Materasso')
add_recovery('sponge', 'D30', 4, 'Materasso')
add_recovery('sponge', 'D30', 10, 'Longheroni', 'Sempre H14 x63/143/193/203')
add_recovery('sponge', 'D30', 14, 'Longheroni', 'Sempre H14 x63/143/193/203')

# D25/35 Rosso
add_recovery('sponge', 'D25', 1.5, 'Materasso')
add_recovery('sponge', 'D35', 1.5, 'Materasso')
add_recovery('sponge', 'D25', 4, 'Bugnato 11 zone', 'Spaccare 6')
add_recovery('sponge', 'D35', 4, 'Bugnato 11 zone', 'Spaccare 6')

# D35 Verde
add_recovery('sponge', 'D35', 1.5, 'Materasso')

# ============================================================
# MEMORY
# ============================================================
print("\n🧠 MEMORY")

# VISCOFLEX BLU NEM40
add_recovery('memory', 'VISCOFLEX', 4, 'Bugnato 11 zone', 'Spaccare 7.4')
add_recovery('memory', 'VISCOFLEX', 4.5, 'Ondina 7 zone')
add_recovery('memory', 'VISCOFLEX', 4.8, 'Liscio per Topper')
add_recovery('memory', 'VISCOFLEX', 4.5, 'Bugnato std', 'Spaccare 7.4')

# VISCOFLEX/SOFT BIANCO
add_recovery('memory', 'SOFT', 2.5, 'Liscio')
add_recovery('memory', 'SOFT', 4.5, 'Liscio')
add_recovery('memory', 'SOFT', 3, 'Liscio')

# ALOE
add_recovery('memory', 'ALOE', 4.5, 'Ondina 7 zone')

# GINSENG
add_recovery('memory', 'GINSENG', 4.5, 'Bugnato std', 'Spaccare 7.4')

# Soya
add_recovery('memory', 'SOYA', 4.5, 'Bugnato std', 'Spaccare 7.4')

# CERAMIC VIOLA
add_recovery('memory', 'CERAMIC', 4, 'Bugnato 11 zone', 'Spaccare 6')

# VITAMINIC
add_recovery('memory', 'VITAMINIC', 4.5, 'Ondina 7 zone')
add_recovery('memory', 'VITAMINIC', 4.5, 'Bugnato std', 'Spaccare 7.4')

# AirSense
add_recovery('memory', 'AIRSENSE', 4.5, 'Ondina 7 zone')

# EM40R BIANCO
add_recovery('memory', 'EM40', 2.5, 'Liscio')
add_recovery('memory', 'EM40', 4.5, 'Ondina 7 zone', 'Ergopure')
add_recovery('memory', 'EM40', 5.5, 'New Aquaform')

# YLANG
add_recovery('memory', 'YLANG', 4.5, 'Ondina 7 zone')

# X-Form
add_recovery('memory', 'X-FORM', 4.5, 'Ondina 7 zone')

# Commit
db.commit()
db.close()

print("\n" + "="*60)
print("✅ POPOLAMENTO COMPLETATO!")
print("="*60 + "\n")
