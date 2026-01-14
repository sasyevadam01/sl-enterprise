import { useState, useEffect } from 'react';
import { useUI } from '../../../components/ui/CustomUI';
import ConfigurationTable from '../ConfigurationTable';

const API_BASE = '/api';

export default function BanchineManager() {
    const { toast, showConfirm } = useUI();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchItems = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/admin/banchine`, {
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
            const res = await fetch(`${API_BASE}/admin/banchine`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                toast.success('Banchina creata!');
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
            const res = await fetch(`${API_BASE}/admin/banchine/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                toast.success('Banchina modificata!');
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
            title: 'Elimina Banchina',
            message: 'Sei sicuro di voler eliminare questa banchina?',
            type: 'danger',
            confirmText: 'Elimina'
        });
        if (!confirm) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/admin/banchine/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success('Banchina eliminata');
                fetchItems();
            } else {
                toast.error('Impossibile eliminare');
            }
        } catch (e) {
            toast.error('Errore server');
        }
    };

    if (loading) return <div className="text-center py-8 text-gray-400">Caricamento banchine...</div>;

    return (
        <ConfigurationTable
            title="Gestione Banchine"
            description="Configura le banchine di lavoro (B1, B2, Piazzale...)."
            items={items}
            columns={[
                { key: 'code', label: 'Codice (es. 1, 2)', placeholder: 'es. 12' },
                { key: 'name', label: 'Nome/Descrizione', placeholder: 'es. Banchina Principale' },
            ]}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            addButtonLabel="Nuova Banchina"
        />
    );
}
