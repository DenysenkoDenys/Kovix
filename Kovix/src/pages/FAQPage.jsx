import { useState, useEffect } from 'react';
import { Container, Accordion, Card, Row, Col, Badge, Pagination, InputGroup, Form } from 'react-bootstrap';
import { supportAPI } from '../services/api';
import '../style/App.css';

export default function FAQPage() {
    const [myTickets, setMyTickets] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isTicketsLoading, setIsTicketsLoading] = useState(false);

    const fetchMyTickets = async () => {
        setIsTicketsLoading(true);
        try {
            const res = await supportAPI.getMyTickets(searchTerm, currentPage);
            setMyTickets(res.data.items);
            setTotalPages(res.data.totalPages);
        } catch (err) {
            console.error("Не вдалося завантажити тікети:", err);
        } finally {
            setIsTicketsLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchMyTickets();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [currentPage, searchTerm]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    return (
        <Container className="my-5 position-relative" style={{ color: 'var(--text-main)', minHeight: 'calc(100vh - 200px)' }}>
            <h1 className="mb-4 fw-bold text-center" style={{ color: 'var(--primary-color)' }}>Довідковий центр Kovix</h1>

            <Row className="justify-content-center">
                <Col lg={8}>
                    <Card className="shadow-sm mb-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px' }}>
                        <Card.Header className="fw-bold py-3" style={{ backgroundColor: 'transparent', borderBottom: '1px solid var(--border-color)', fontSize: '1.2rem' }}>
                            💡 Найчастіші запитання
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Accordion flush>
                                <Accordion.Item eventKey="0" style={{ backgroundColor: 'transparent', borderBottom: '1px solid var(--border-color)' }}>
                                    <Accordion.Header>Як додати фільм або серіал до улюблених?</Accordion.Header>
                                    <Accordion.Body style={{ color: 'var(--text-secondary)' }}>
                                        Перейдіть на сторінку потрібного фільму чи серіалу та натисніть на іконку серця ("Додати в улюблені") під постером. Знайти всі збережені тайтли можна у вашому профілі в розділі "Улюблене".
                                    </Accordion.Body>
                                </Accordion.Item>

                                <Accordion.Item eventKey="1" style={{ backgroundColor: 'transparent', borderBottom: '1px solid var(--border-color)' }}>
                                    <Accordion.Header>Як працює система оцінювання на Kovix?</Accordion.Header>
                                    <Accordion.Body style={{ color: 'var(--text-secondary)' }}>
                                        Ви можете оцінити будь-який тайтл за 10-бальною шкалою. Загальний рейтинг фільму формується як середнє арифметичне всіх оцінок користувачів платформи. Ваша оцінка автоматично враховується в загальному рейтингу протягом кількох хвилин.
                                    </Accordion.Body>
                                </Accordion.Item>

                                <Accordion.Item eventKey="2" style={{ backgroundColor: 'transparent', borderBottom: '1px solid var(--border-color)' }}>
                                    <Accordion.Header>Чому мій відгук було видалено?</Accordion.Header>
                                    <Accordion.Body style={{ color: 'var(--text-secondary)' }}>
                                        Відгуки видаляються модераторами, якщо вони порушують правила платформи Kovix. До них належать: спойлери без відповідної позначки, нецензурна лексика, образи інших користувачів або спам. Якщо ви вважаєте, що сталася помилка, зверніться до модератора.
                                    </Accordion.Body>
                                </Accordion.Item>

                                <Accordion.Item eventKey="3" style={{ backgroundColor: 'transparent', borderBottom: 'none' }}>
                                    <Accordion.Header>Як змінити нікнейм або аватар?</Accordion.Header>
                                    <Accordion.Body style={{ color: 'var(--text-secondary)' }}>
                                        Перейдіть до налаштувань вашого профілю, натиснувши на свою аватарку в правому верхньому куті екрана. У розділі "Редагувати профіль" ви зможете оновити свої особисті дані.
                                    </Accordion.Body>
                                </Accordion.Item>
                            </Accordion>
                        </Card.Body>
                    </Card>

                    <div className="d-flex justify-content-between align-items-center mt-5 mb-3">
                        <h4 className="fw-bold mb-0">Мої звернення</h4>
                        <InputGroup style={{ maxWidth: '300px' }}>
                            <Form.Control
                                placeholder="Пошук звернень..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                style={{
                                    backgroundColor: 'var(--bg-card)',
                                    color: 'var(--text-main)',
                                    borderColor: 'var(--border-color)',
                                    borderRadius: '8px'
                                }}
                            />
                        </InputGroup>
                    </div>

                    {isTicketsLoading ? (
                        <div className="text-center py-4">Завантаження...</div>
                    ) : (
                        <>
                            {myTickets.length === 0 ? (
                                <p className="text-center text-muted py-3">Звернень не знайдено.</p>
                            ) : (
                                myTickets.map(ticket => (
                                    <Card key={ticket.id} className="mb-3 shadow-sm border-0" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px' }}>
                                        <Card.Body>
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <h6 className="fw-bold mb-0" style={{ color: 'var(--primary-color)' }}>{ticket.subject}</h6>
                                                {ticket.isResolved ? <Badge bg="success">Вирішено</Badge> : <Badge bg="warning" text="dark">В черзі</Badge>}
                                            </div>
                                            <p className="small mb-3" style={{ color: 'var(--text-secondary)' }}>{ticket.message}</p>

                                            {ticket.adminReply && (
                                                <div className="p-3 rounded-3" style={{ backgroundColor: 'rgba(33, 150, 243, 0.08)', borderLeft: '4px solid var(--primary-color)' }}>
                                                    <div className="small fw-bold text-primary mb-1">💬 Відповідь модератора:</div>
                                                    <div className="small">{ticket.adminReply}</div>
                                                </div>
                                            )}
                                        </Card.Body>
                                    </Card>
                                ))
                            )}

                            {totalPages > 1 && (
                                <div className="d-flex justify-content-center mt-4">
                                    <Pagination>
                                        <Pagination.Prev
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                        />
                                        {[...Array(totalPages)].map((_, i) => (
                                            <Pagination.Item
                                                key={i + 1}
                                                active={i + 1 === currentPage}
                                                onClick={() => setCurrentPage(i + 1)}
                                            >
                                                {i + 1}
                                            </Pagination.Item>
                                        ))}
                                        <Pagination.Next
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                        />
                                    </Pagination>
                                </div>
                            )}
                        </>
                    )}

                </Col>
            </Row>
        </Container>
    );
}