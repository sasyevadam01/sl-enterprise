import { useState, useEffect } from 'react';
import { useUI } from '../../../components/ui/CustomUI';
import ConfigurationTable from '../ConfigurationTable';

const API_BASE = '/api';

export default function JobRolesManager() {
    const { toast, showConfirm } = useUI();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchItems = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/admin/job-roles`, {
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
            const res = await fetch(`${API_BASE}/admin/job-roles`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                toast.success('Ruolo creato!');
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
            const res = await fetch(`${API_BASE}/admin/job-roles/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                toast.success('Ruolo modificato!');
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
            title: 'Elimina Ruolo',
            message: 'Sei sicuro di voler eliminare questo ruolo?',
            type: 'danger',
            confirmText: 'Elimina'
        });
        if (!confirm) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/admin/job-roles/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success('Ruolo eliminato');
                fetchItems();
            } else {
                toast.error('Impossibile eliminare');
            }
        } catch (e) {
            toast.error('Errore server');
        }
    };

    if (loading) return <div className="text-center py-8 text-gray-400">Caricamento ruoli...</div>;

    return (
        <ConfigurationTable
            title="Gestione Ruoli Operativi"
            description="Definisci le mansioni assegnabili ai dipendenti (es. Incollatore, Magazziniere)."
            items={items}
            columns={[
                { key: 'name', label: 'Nome Ruolo', placeholder: 'es. Bordatore' },
                { key: 'description', label: 'Descrizione', placeholder: 'es. Operatore di linea...' },
                { key: 'employee_count', label: 'Dipendenti', render: (val) => val || 0, required: false }
            ]}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            addButtonLabel="Nuovo Ruolo"
        />
    );
}
