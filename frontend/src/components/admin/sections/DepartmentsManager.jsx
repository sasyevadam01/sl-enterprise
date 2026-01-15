import { useState, useEffect } from 'react';
import { useUI } from '../../../components/ui/CustomUI';
import ConfigurationTable from '../ConfigurationTable';

const API_BASE = '/api';

export default function DepartmentsManager() {
    const { toast, showConfirm } = useUI();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchItems = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/admin/departments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setItems(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchItems(); }, []);

    const handleAdd = async (data) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/admin/departments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                toast.success('Reparto creato!');
                fetchItems();
            } else {
                const err = await res.json();
                toast.error(err.detail || 'Errore');
            }
        } catch (e) {
            toast.error('Errore server');
        }
    };

    const handleEdit = async (id, data) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/admin/departments/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                toast.success('Reparto modificato!');
                fetchItems();
            } else {
                const err = await res.json();
                toast.error(err.detail || 'Errore');
            }
        } catch (e) {
            toast.error('Errore server');
        }
    };

    const handleDelete = async (id) => {
        const confirm = await showConfirm({
            title: 'Elimina Reparto',
            message: 'Sei sicuro di voler eliminare questo reparto?',
            type: 'danger',
            confirmText: 'Elimina'
        });
        if (!confirm) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/admin/departments/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success('Reparto eliminato');
                fetchItems();
            } else {
                toast.error('Impossibile eliminare');
            }
        } catch (e) {
            toast.error('Errore server');
        }
    };

    if (loading) return <div className="text-center py-8 text-gray-400">Caricamento reparti...</div>;

    return (
        <ConfigurationTable
            title="Gestione Reparti"
            description="Configura i reparti aziendali e i centri di costo."
            items={items}
            columns={[
                { key: 'name', label: 'Nome Reparto', placeholder: 'es. Bordatura' },
                { key: 'cost_center', label: 'Centro di Costo', placeholder: 'es. CC001' },
                { key: 'employee_count', label: 'Dipendenti', render: (val) => val || 0, required: false } // Read only basically
            ]}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            addButtonLabel="Nuovo Reparto"
        />
    );
}
