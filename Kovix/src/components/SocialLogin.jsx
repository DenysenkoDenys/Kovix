import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/apiConfig';

const SocialLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const idToken = credentialResponse?.credential;
      if (!idToken) throw new Error("Google credential is undefined");

      const response = await axios.post(`${API_BASE_URL}/api/auth/external-login`, {
        provider: "Google",
        idToken: idToken
      });

      const { token } = response.data;

      login(token);


      navigate('/');

    } catch (err) {
      console.error("Google login error:", err);
    }
  };

  return <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => console.log('Login Failed')} />;
};

export default SocialLogin;