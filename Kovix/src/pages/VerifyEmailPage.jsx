import { useState, useRef } from 'react';
import { Container, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function VerifyEmailPage() {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [status, setStatus] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const inputRefs = useRef([]);
    const navigate = useNavigate();

    const handleSendCode = async () => {
        setSendingCode(true);
        setStatus({ type: '', text: '' });
        try {
            await authAPI.sendVerificationCode();
            setStatus({ type: 'success', text: 'Код надіслано! Перевірте вашу пошту (можливо, папку Спам).' });
        } catch (err) {
            setStatus({ type: 'danger', text: err.response?.data || 'Помилка відправки коду.' });
        } finally {
            setSendingCode(false);
        }
    };

    const handleChange = (index, value) => {
        if (!/^[0-9]*$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);

        if (value && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text');
        
        const digits = pastedData.replace(/\D/g, '').slice(0, 6);

        if (digits.length > 0) {
            const newCode = [...code];
            for (let i = 0; i < digits.length; i++) {
                newCode[i] = digits[i];
            }
            setCode(newCode);

            const nextFocusIndex = digits.length < 6 ? digits.length : 5;
            if (inputRefs.current[nextFocusIndex]) {
                inputRefs.current[nextFocusIndex].focus();
            }
        }
    };

    const handleVerify = async () => {
        const fullCode = code.join('');
        if (fullCode.length !== 6) return;

        setLoading(true);
        try {
            await authAPI.verifyEmail(fullCode);
            setStatus({ type: 'success', text: 'Email успішно підтверджено!' });
            
            setTimeout(() => {
                window.location.href = '/'; 
            }, 1500);
            
        } catch (err) {
            setStatus({ type: 'danger', text: err.response?.data || 'Невірний або прострочений код.' });
            setCode(['', '', '', '', '', '']);
            if(inputRefs.current[0]) inputRefs.current[0].focus();
        } finally {
            setLoading(false);
        }
    };

    const logoutAndGoBack = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
            <Card style={{ width: '450px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }} className="shadow">
                <Card.Body className="text-center p-4">
                    <h2 className="fw-bold mb-3">✉️ Підтвердження Email</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        З міркувань безпеки, ви маєте підтвердити свою електронну пошту, щоб отримати доступ до платформи.
                    </p>

                    <Button 
                        variant="outline-primary" 
                        onClick={handleSendCode} 
                        disabled={sendingCode}
                        className="mb-4 rounded-pill px-4 fw-bold"
                    >
                        {sendingCode ? <Spinner size="sm" /> : 'Відправити код на пошту'}
                    </Button>

                    {status.text && <Alert variant={status.type} className="rounded-3">{status.text}</Alert>}

                    <div className="d-flex justify-content-center gap-2 mb-4">
                        {code.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => inputRefs.current[index] = el}
                                type="text"
                                maxLength="1"
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={handlePaste} 
                                style={{
                                    width: '50px',
                                    height: '60px',
                                    fontSize: '28px',
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--bg-main)',
                                    color: 'var(--text-main)',
                                    border: `2px solid ${digit ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                            />
                        ))}
                    </div>

                    <Button 
                        variant="primary" 
                        className="w-100 py-2 fw-bold mb-3" 
                        onClick={handleVerify} 
                        disabled={loading || code.join('').length !== 6}
                        style={{ backgroundColor: 'var(--primary-color)', borderColor: 'var(--primary-color)' }}
                    >
                        {loading ? 'Перевірка...' : 'Підтвердити'}
                    </Button>

                    <Button variant="link" className="text-muted text-decoration-none" onClick={logoutAndGoBack}>
                        Повернутися до входу
                    </Button>
                </Card.Body>
            </Card>
        </Container>
    );
}