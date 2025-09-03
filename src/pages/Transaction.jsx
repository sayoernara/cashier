import React, { useEffect, useState, useMemo } from 'react';
import { getStorageData, getTransactionByCashier } from './apis/api';
import { Alert, Spinner, Form } from 'react-bootstrap';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
dayjs.locale('id');

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

const viewStyles = {
    wrapper: {
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 25px',
        borderBottom: '1px solid #e2e8f0',
        flexShrink: 0,
    },
    title: {
        fontFamily: 'Poppins, sans-serif',
        fontSize: '1.5em',
        margin: 0,
        fontWeight: 600
    },
    closeButton: {
        background: 'none',
        border: 'none',
        fontSize: '1.8em',
        cursor: 'pointer',
        color: '#6b7280'
    },
    searchContainer: {
        position: 'relative',
        padding: '15px 25px',
        flexShrink: 0,
    },
    searchInput: {
        width: '100%', padding: '12px 20px 12px 45px', fontSize: '1em',
        borderRadius: '10px', border: '1px solid #e2e8f0', boxSizing: 'border-box',
        backgroundColor: '#f8faff', fontFamily: 'Poppins, sans-serif',
    },
    listHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px 35px 10px 25px',
        backgroundColor: '#f8faff',
        color: '#718096',
        fontSize: '0.9em',
        fontWeight: '600',
        borderBottom: '1px solid #e2e8f0',
        flexShrink: 0,
    },
    listContainer: {
        overflowY: 'auto',
        flexGrow: 1,
        padding: '0 25px'
    },
    transactionItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '20px 0',
        borderBottom: '1px solid #f0f2f5',
    },
    infoContainer: { display: 'flex', flexDirection: 'column', gap: '4px' },
    trxId: { fontWeight: '600', color: '#1a202c', fontSize: '1em' },
    trxDate: { fontSize: '0.85em', color: '#718096' },
    itemList: {
        fontSize: '0.9em', color: '#4a5568', marginTop: '8px',
        paddingLeft: '20px', listStyleType: 'circle', marginBottom: 0,
    },
    nominal: {
        fontSize: '1em', fontWeight: '600', color: '#2d3748',
        whiteSpace: 'nowrap', marginLeft: '16px',
    },
};

const CustomScrollbarStyles = () => (
    <style>{`
        .transaction-list-container::-webkit-scrollbar { width: 6px; }
        .transaction-list-container::-webkit-scrollbar-track { background: transparent; }
        .transaction-list-container::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 10px; }
        .transaction-list-container::-webkit-scrollbar-thumb:hover { background: #a0aec0; }
    `}</style>
);

function Transaction({ onClose }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [username] = useState(getStorageData()?.decryptrname || '');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    useEffect(() => {
        if (!username) {
            setLoading(false);
            setError({ message: 'User tidak ditemukan.' });
            return;
        }
        const fetchTransactions = async () => {
            setLoading(true);
            setError(null);
            try {
                const startDate = dayjs().startOf('day').format('YYYY-MM-DD');
                const endDate = dayjs().endOf('day').format('YYYY-MM-DD');
                const response = await getTransactionByCashier(startDate, endDate, username);
                if (response?.data?.translist && Array.isArray(response.data.translist)) {
                    setTransactions(response.data.translist);
                } else {
                    setTransactions([]);
                }
            } catch (err) {
                setError(err);
                setTransactions([]);
            } finally {
                setLoading(false);
            }
        };
        fetchTransactions();
    }, [username]);

    const groupedData = useMemo(() => {
        const filtered = transactions.filter(trx =>
            (trx.item_nm ?? "").toLowerCase().includes((debouncedSearchTerm ?? "").toLowerCase()) ||
            (trx.nomor ?? "").toLowerCase().includes((debouncedSearchTerm ?? "").toLowerCase())
        );

        return filtered.reduce((acc, trx) => {
            if (!acc[trx.nomor]) {
                acc[trx.nomor] = [];
            }
            acc[trx.nomor].push(trx);
            return acc;
        }, {});
    }, [transactions, debouncedSearchTerm]);


    const nomorKeys = Object.keys(groupedData);

    const renderContent = () => {
        if (loading) {
            return <div className="text-center my-5"><Spinner animation="border" /><p>Memuat data...</p></div>;
        }
        if (error) {
            return <Alert variant="danger" className="m-4">Error: {error.message || 'Gagal memuat data.'}</Alert>;
        }
        if (nomorKeys.length === 0) {
            return <Alert variant="info" className="m-4">{searchTerm ? "Tidak ada transaksi yang cocok." : "Belum ada transaksi hari ini."}</Alert>;
        }
        return (
            <>
                <div style={viewStyles.listHeader}>
                    <span>ID Transaksi & Item</span>
                    <span>Nominal</span>
                </div>
                <div style={viewStyles.listContainer} className="transaction-list-container">
                    {nomorKeys.map((nomor) => {
                        const group = groupedData[nomor];
                        const totalNett = group.reduce((sum, item) => sum + Number(item.nettprice || 0), 0);
                        return (
                            <div key={nomor} style={viewStyles.transactionItem}>
                                <div style={viewStyles.infoContainer}>
                                    <div style={viewStyles.trxId}>{nomor}</div>
                                    <div style={viewStyles.trxDate}>{dayjs(group[0].tanggal).format('DD MMMM YYYY, HH:mm')}</div>
                                    <ul style={viewStyles.itemList}>
                                        {group.map((item, index) => (
                                            <li key={index}>{item.item_nm} ({item.weight_kg ? `${item.weight_kg} kg` : '-'})</li>
                                        ))}
                                    </ul>
                                </div>
                                <div style={viewStyles.nominal}>
                                    Rp {new Intl.NumberFormat('id-ID').format(totalNett)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </>
        );
    };

    return (
        <div style={viewStyles.wrapper}>
            <CustomScrollbarStyles />
            <div style={viewStyles.header}>
                <h2 style={viewStyles.title}>Riwayat Transaksi Hari Ini</h2>
                <button style={viewStyles.closeButton} onClick={onClose}>&times;</button>
            </div>
            <div style={viewStyles.searchContainer}>
                <Form.Control
                    type="text"
                    placeholder="Cari berdasarkan Nama Barang atau Nomor Transaksi..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={viewStyles.searchInput}
                />
            </div>
            {renderContent()}
        </div>
    );
}

export default Transaction;