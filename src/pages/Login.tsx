import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Lock, Mail } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const { signIn, signUp, user, isLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const action = isLogin ? signIn : signUp;
    const { error } = await action(email, password);

    if (error) {
      setErrorMsg(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#5E17EB]/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#10B981]/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="glass-panel max-w-md w-full p-8 rounded-2xl relative z-10 border border-white/10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#5E17EB] to-[#10B981] rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-[#5E17EB]/20">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Leads Solution IA</h1>
          <p className="text-white/50 text-sm mt-2">{isLogin ? 'Faça login para acessar o sistema' : 'Crie sua conta administrativa'}</p>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-6 text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field w-full pl-10" 
                placeholder="seu@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field w-full pl-10" 
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3 mt-4">
            {isLoading ? 'Aguarde...' : (isLogin ? 'Entrar' : 'Criar Conta')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem conta? Faça login'}
          </button>
        </div>
      </div>
    </div>
  );
}
