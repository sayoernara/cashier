import { useState } from 'react';
import { Container, Row, Col, Carousel, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { TbEye, TbEyeClosed } from "react-icons/tb";
import { login } from './apis/api';
import { FaCashRegister } from 'react-icons/fa';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const validateFields = () => {
    let isValid = true;
    setUsernameError('');
    setPasswordError('');

    if (!username.trim()) {
      setUsernameError('Username tidak boleh kosong.');
      isValid = false;
    }
    if (!password.trim()) {
      setPasswordError('Password tidak boleh kosong.');
      isValid = false;
    }
    return isValid;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateFields()) return;
    setLoading(true);

    try {
      const response = await login(username, password);
      if (response.status === 200) {
        navigate('/dashboard');
        return;
      }
      if (response.status === 401) {
        setError(response.data?.message || 'Login gagal. Periksa kembali username dan password.');
      } else {
        setError(response.data?.message || 'Terjadi kesalahan pada server.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Terjadi kesalahan, silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="vh-100 d-flex justify-content-center align-items-center">
      <Card
        style={{
          maxWidth: '900px',
          width: '100%',
          height: '500px', // 🔹 tinggi tetap
          overflow: 'hidden',
          borderRadius: '15px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
        }}
      >
        <Row className="g-0 h-100">

          {/* Kiri: Carousel */}
          <Col md={6} className="h-100">
            <Carousel fade controls={false} indicators={false} interval={3000} className="h-100">
              <Carousel.Item className="h-100">
                <img
                  className="d-block w-100 h-100"
                  src="https://images.unsplash.com/photo-1579113800032-c38bd7635818?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                  alt="Sayur 1"
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                />
              </Carousel.Item>
              <Carousel.Item className="h-100">
                <img
                  className="d-block w-100 h-100"
                  src="https://images.unsplash.com/photo-1558818498-28c1e002b655?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                  alt="Sayur 2"
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                />
              </Carousel.Item>
              <Carousel.Item className="h-100">
                <img
                  className="d-block w-100 h-100"
                  src="https://images.unsplash.com/photo-1533321942807-08e4008b2025?q=80&w=459&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                  alt="Sayur 3"
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                />
              </Carousel.Item>
            </Carousel>
          </Col>

          {/* Kanan: Form */}
          <Col md={6} className="d-flex justify-content-center align-items-center p-4 bg-white h-100">
            <div style={{ maxWidth: '350px', width: '100%' }}>
              <div className="text-center mb-4">
                <FaCashRegister size={60} color="#007bff" />
                <h3 style={{color:'#3498db'}}>Sayoernara | Cashier App</h3>
              </div>
              {error && (
                <div className="alert alert-danger">{error}</div>
              )}
              <form onSubmit={handleLogin}>
                <div className="mb-3">
                  <input
                    type="text"
                    className={`form-control ${usernameError ? "is-invalid" : ""}`}
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="mb-3 position-relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`form-control ${passwordError ? "is-invalid" : ""}`}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <span
                    className="position-absolute end-0 top-50 translate-middle-y me-3 cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <TbEye /> : <TbEyeClosed />}
                  </span>
                </div>
                <button type="submit" className="btn btn-primary w-100 py-2">
                  {loading ? 'Logging in...' : 'Sign In'}
                </button>
              </form>
            </div>
          </Col>
        </Row>
      </Card>

    </Container>
  );
}

export default Login;
