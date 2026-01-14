import { useState, useEffect } from 'react';
import { useUI } from '../../../components/ui/CustomUI';
import ConfigurationTable from '../ConfigurationTable';

const API_BASE = '/api';

export default function WorkstationsManager() {
    const { toast, showConfirm } = useUI();
    const [items, setItems] = useState([]);
    const [banchine, setBanchine] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [wsRes, fleetRes] = await Promise.all([
                fetch(`${API_BASE}/admin/workstations`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE}/admin/banchine`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (wsRes.ok) setItems(await wsRes.json());
            if (fleetRes.ok) setBanchine(await fleetRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAdd = async (data) => {
        try {
            const token = localStorage.getItem('token');
            const payload = {
                ...data,
                department_id: data.department_id ? parseInt(data.department_id) : null,
                code: data.code // Keep string or handle? Backend handles it? logic copied from Page: just send it.
            };

            const res = await fetch(`${API_BASE}/admin/workstations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                toast.success('Postazione creata!');
                fetchData();
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
            const payload = {
                ...data,
                department_id: data.department_id ? parseInt(data.department_id) : null
            };

            const res = await fetch(`${API_BASE}/admin/workstations/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                toast.success('Postazione modificata!');
                fetchData();
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
            title: 'Elimina Postazione',
            message: 'Sei sicuro di voler eliminare questa postazione?',
            type: 'danger',
            confirmText: 'Elimina'
        });
        if (!confirm) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/admin/workstations/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success('Postazione eliminata');
                fetchData();
            } else {
                toast.error('Impossibile eliminare');
            }
        } catch (e) {
            toast.error('Errore server');
        }
    };



    const banchinaOptions = banchine.map(d => ({ value: d.id, label: d.name || d.code }));

    if (loading) return <div className="text-center py-8 text-gray-400">Caricamento postazioni...</div>;

    return (
        <ConfigurationTable
            title="Gestione Postazioni KPI"
            description="Configura le postazioni di lavoro."
            items={items}
            columns={[
                { key: 'name', label: 'Nome Postazione', placeholder: 'es. Incollatrice 1' },
                {
                    key: 'department_id',
                    label: 'Reparto / Banchina',
                    type: 'select',
                    options: banchinaOptions,
                    render: (val) => {
                        const found = banchine.find(d => d.id === val);
                        return found ? (found.name || found.code) : '-';
                    }
                },
                { key: 'description', label: 'Descrizione', placeholder: 'Opzionale' },

            ]}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            addButtonLabel="Nuova Postazione"
        />
    );
}
