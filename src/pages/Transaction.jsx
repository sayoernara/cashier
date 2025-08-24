import React, { useCallback, useState } from 'react';
import { getStorageData, getTransactionByCashier } from './apis/api';
import { Alert, Col, Row, Spinner, Card, Button, Form, Table, Pagination } from 'react-bootstrap';
import dayjs from 'dayjs';

function Transaction() {
    const [loadingTransaction, setLoadingTransaction] = useState(false);
    const [errorTransaction, setErrorTransaction] = useState(null);
    const [dataTransaction, setDataTransaction] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [username] = useState(getStorageData().decryptrname);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5; 

    const fetchTransaction = useCallback(async () => {
        if (!startDate || !endDate) {
            setErrorTransaction({ message: 'Harap pilih tanggal mulai dan tanggal selesai.' });
            return;
        }

        try {
            setLoadingTransaction(true);
            setErrorTransaction(null);
            setHasSearched(true);

            const response = await getTransactionByCashier(startDate, endDate, username);

            if (response && response.data && Array.isArray(response.data.translist)) {
                setDataTransaction(response.data.translist);
                setCurrentPage(1); 
            } else {
                setDataTransaction([]);
            }
        } catch (error) {
            setErrorTransaction(error);
            setDataTransaction([]);
        } finally {
            setLoadingTransaction(false);
        }
    }, [startDate, endDate, username]);

    // group by nomor
    const groupByNomor = (transactions) => {
        return transactions.reduce((acc, trx) => {
            if (!acc[trx.nomor]) {
                acc[trx.nomor] = [];
            }
            acc[trx.nomor].push(trx);
            return acc;
        }, {});
    };

    const groupedData = groupByNomor(dataTransaction);
    const nomorKeys = Object.keys(groupedData);

    // pagination logic
    const totalPages = Math.ceil(nomorKeys.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedNomorKeys = nomorKeys.slice(startIndex, endIndex);

    // render content
    const renderContent = () => {
        if (loadingTransaction) {
            return (
                <div className="text-center">
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </Spinner>
                    <p>Memuat data transaksi...</p>
                </div>
            );
        }

        if (errorTransaction) {
            return <Alert variant="danger">Error: {errorTransaction.message || 'Gagal memuat data.'}</Alert>;
        }
        if (!hasSearched) {
            return (
                <Alert variant="info">
                    Silakan pilih rentang tanggal dan klik 'Cari Transaksi' untuk melihat data.
                </Alert>
            );
        }
        if (hasSearched && dataTransaction.length === 0) {
            return <Alert variant="warning">Tidak ada data transaksi pada rentang tanggal yang dipilih.</Alert>;
        }

        return (
            <>
                {paginatedNomorKeys.map((nomor) => {
                    const group = groupedData[nomor];
                    const totalNett = group.reduce((sum, item) => sum + Number(item.nettprice || 0), 0);

                    return (
                        <div key={nomor} className="mb-4">
                            <h5 className="bg-light p-2 border">Transaksi: {nomor} | {dayjs(group[0].tanggal).format('DD/MM/YYYY HH:mm')}</h5>

                            <Table striped bordered hover responsive>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Cashier</th>
                                        <th>Nama Barang</th>
                                        <th>Berat Barang</th>
                                        <th>Harga</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.map((trx, index) => (
                                        <tr key={trx.id || `${nomor}-${index}`}>
                                            <td>{index + 1}</td>
                                            <td>{trx.cashier}</td>
                                            <td>{trx.item_nm}</td>
                                            <td>{trx.weight_kg} kg</td>
                                            <td>Rp {trx.nettprice}</td>
                                        </tr>
                                    ))}
                                    <tr className="table-secondary fw-bold">
                                        <td colSpan={4} className="text-end">Total Nett</td>
                                        <td>Rp {totalNett}</td>
                                    </tr>
                                </tbody>
                            </Table>
                        </div>
                    );
                })}

                <div className="d-flex justify-content-center">
                    <Pagination>
                        <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
                        <Pagination.Prev onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} />

                        {(() => {
                            let items = [];

                            for (let i = 1; i <= totalPages; i++) {
                                if (
                                    i === 1 ||
                                    i === 2 ||
                                    i === totalPages ||
                                    i === totalPages - 1 ||
                                    (i >= currentPage - 1 && i <= currentPage + 1)
                                ) {
                                    items.push(
                                        <Pagination.Item
                                            key={i}
                                            active={i === currentPage}
                                            onClick={() => setCurrentPage(i)}
                                        >
                                            {i}
                                        </Pagination.Item>
                                    );
                                } else if (
                                    i === 3 && currentPage > 4
                                ) {
                                    items.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);
                                } else if (
                                    i === totalPages - 2 && currentPage < totalPages - 3
                                ) {
                                    items.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
                                }
                            }

                            return items;
                        })()}

                        <Pagination.Next onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} />
                        <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
                    </Pagination>
                </div>

            </>
        );
    };

    return (
        <div className="container py-4">
            <h2 className="mb-4">Riwayat Transaksi</h2>

            <Card className="mb-4 shadow-sm">
                <Card.Header as="h5">Filter Pencarian</Card.Header>
                <Card.Body>
                    <Form>
                        <Row className="align-items-end g-3">
                            <Col md={4}>
                                <Form.Group controlId="formStartDate">
                                    <Form.Label><strong>Tanggal Mulai</strong></Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group controlId="formEndDate">
                                    <Form.Label><strong>Tanggal Selesai</strong></Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Button
                                    variant="primary"
                                    className="w-100"
                                    onClick={fetchTransaction}
                                    disabled={loadingTransaction || !startDate || !endDate}
                                >
                                    {loadingTransaction ? 'Mencari...' : 'Cari Transaksi'}
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            <Card className="shadow-sm">
                <Card.Header as="h5">Hasil Transaksi</Card.Header>
                <Card.Body>
                    {renderContent()}
                </Card.Body>
            </Card>
        </div>
    );
}

export default Transaction;
