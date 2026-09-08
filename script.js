// ============================================
// CONFIGURAÇÃO
// ============================================
const isLocalhost = window.location.hostname === '127.0.0.1' || 
                    window.location.hostname === 'localhost';

const API_URL = 'https://back-end-stream.vercel.app';
const AMBIENTE = isLocalhost ? 'DESENVOLVIMENTO' : 'PRODUCAO';

// ============================================
// VARIAVEIS GLOBAIS
// ============================================
let tokenAtual = localStorage.getItem('token') || null;
const PRECO_POR_CONTA = 20.00;
let intervalCheck = null;
let usuarioLiberado = false;

// ============================================
// FUNCAO PARA REQUISICOES
// ============================================
async function apiRequest(endpoint, method, data) {
    const headers = { 'Content-Type': 'application/json' };
    if (tokenAtual) headers['Authorization'] = `Bearer ${tokenAtual}`;

    const url = `${API_URL}${endpoint}`.replace(/([^:]\/)\/+/g, "$1");

    try {
        const response = await fetch(url, {
            method,
            headers,
            body: data ? JSON.stringify(data) : undefined,
        });

        const result = await response.json();
        return { response, result };
    } catch (error) {
        console.error('Erro na requisicao');
        throw error;
    }
}

// ============================================
// MOSTRAR RESULTADO
// ============================================
function mostrarResultado(id, sucesso, mensagem, dados = null) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `resultado ${sucesso ? 'sucesso' : 'erro'}`;
    
    let html = `${sucesso ? '✅' : '❌'} ${mensagem}`;
    if (dados) {
        html += `<div style="margin-top:8px;font-size:13px;">${dados}</div>`;
    }
    el.innerHTML = html;
    el.style.display = 'block';
}

// ============================================
// ✅ VERIFICAR PAGAMENTO (USANDO A ROTA DO BACKEND)
// ============================================
async function verificarPagamento(email) {
    try {
        const response = await fetch(`${API_URL}/check-pagamento?email=${encodeURIComponent(email)}`);
        const result = await response.json();
        return result.pago || false;
    } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
        return false;
    }
}

// ============================================
// ✅ ESCUTAR PAGAMENTO (POLLING SEGURO)
// ============================================
function escutarPagamento(email) {
    if (intervalCheck) {
        clearInterval(intervalCheck);
        intervalCheck = null;
    }

    console.log('🔄 Verificando pagamento para:', email);
    
    let tentativas = 0;
    const maxTentativas = 60; // 60 * 5s = 5 minutos
    
    intervalCheck = setInterval(async () => {
        tentativas++;
        
        const pago = await verificarPagamento(email);
        
        if (pago) {
            console.log('✅ Pagamento confirmado!');
            usuarioLiberado = true;
            clearInterval(intervalCheck);
            intervalCheck = null;
            
            const el = document.getElementById('resultadoLogin');
            if (el) {
                el.className = 'resultado sucesso';
                el.innerHTML = `
                    ✅ <strong>Pagamento confirmado!</strong><br>
                    Você já pode acessar o sistema.
                    <br><br>
                    <button onclick="tentarLoginNovamente()" class="btn btn-primary" style="padding:8px 24px;font-size:14px;border:none;border-radius:8px;background:#667eea;color:white;cursor:pointer;">
                        🔓 Acessar agora
                    </button>
                `;
                el.style.display = 'block';
            }
        }
        
        if (tentativas >= maxTentativas) {
            clearInterval(intervalCheck);
            intervalCheck = null;
            console.log('⏰ Tempo esgotado para verificação');
            
            const el = document.getElementById('resultadoLogin');
            if (el && !usuarioLiberado) {
                el.innerHTML = `
                    <strong>⏰ Tempo esgotado</strong><br>
                    O pagamento ainda não foi confirmado.
                    <br><br>
                    <a href="comprar.html" style="display:inline-block;padding:10px 24px;background:#28a745;color:white;border:none;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;transition:0.3s ease;">
                        🔗 Pagar agora
                    </a>
                    <br><br>
                    <button onclick="verificarPagamentoManual('${email}')" style="padding:8px 20px;background:transparent;color:#667eea;border:1.5px solid #667eea;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;transition:0.3s ease;">
                        🔄 Verificar novamente
                    </button>
                `;
            }
        }
    }, 5000); // Verificar a cada 5 segundos
}

// ============================================
// TENTAR LOGIN NOVAMENTE
// ============================================
function tentarLoginNovamente() {
    const email = document.getElementById('loginEmail')?.value;
    const senha = document.getElementById('loginSenha')?.value;
    if (email && senha) {
        document.getElementById('formLogin').dispatchEvent(new Event('submit'));
    }
}
window.tentarLoginNovamente = tentarLoginNovamente;

// ============================================
// VERIFICAR PAGAMENTO MANUALMENTE
// ============================================
async function verificarPagamentoManual(email) {
    try {
        const pago = await verificarPagamento(email);
        if (pago) {
            alert('✅ Pagamento confirmado! Faça login novamente.');
            window.location.reload();
        } else {
            alert('⏳ Pagamento ainda não confirmado. Aguarde ou entre em contato.');
        }
    } catch (error) {
        alert('Erro ao verificar pagamento.');
    }
}
window.verificarPagamentoManual = verificarPagamentoManual;

// ============================================
// CADASTRO
// ============================================
const formCadastro = document.getElementById('formCadastro');
if (formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome_usuario = document.getElementById('cadastroNome').value;
        const email = document.getElementById('cadastroEmail').value;
        const senha = document.getElementById('cadastroSenha').value.trim();
        const perfil = document.querySelector('input[name="plano"]:checked')?.value || 'Premium';
        const pago = document.querySelector('input[name="pago"]:checked')?.value === 'true';

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Cadastrando...';

        try {
            const { response, result } = await apiRequest('/cadastrar', 'POST', {
                nome_usuario, email, senha, perfil, pago
            });

            if (response.ok) {
                mostrarResultado('resultadoCadastro', true, 'Cadastro realizado!', `
                    <strong>Nome:</strong> ${result.dados.nome_usuario}<br>
                    <strong>Email:</strong> ${result.dados.email}<br>
                    <strong>Perfil:</strong> ${perfil}
                `);
                setTimeout(() => window.location.href = 'login.html', 1500);
            } else {
                mostrarResultado('resultadoCadastro', false, result.message || 'Erro no cadastro');
            }
        } catch (error) {
            mostrarResultado('resultadoCadastro', false, 'Erro de conexão');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Criar conta';
        }
    });
}

// ============================================
// LOGIN
// ============================================
const formLogin = document.getElementById('formLogin');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const senha = document.getElementById('loginSenha').value;
        const btn = e.target.querySelector('button[type="submit"]');

        btn.disabled = true;
        btn.textContent = 'Entrando...';

        try {
            const { response, result } = await apiRequest('/login', 'POST', { email, senha });

            if (response.ok) {
                tokenAtual = result.dados.token;
                localStorage.setItem('token', tokenAtual);

                if (intervalCheck) {
                    clearInterval(intervalCheck);
                    intervalCheck = null;
                }

                mostrarResultado('resultadoLogin', true, 'Login realizado!');
                setTimeout(() => window.location.href = 'perfil.html', 1000);
                
            } else {
                // 🔴 PAGAMENTO PENDENTE - INICIAR POLLING
                if (response.status === 402 && result.codigo === 'PAGAMENTO_PENDENTE') {
                    const el = document.getElementById('resultadoLogin');
                    el.className = 'resultado erro-pagamento';
                    el.innerHTML = `
                        <strong>⏳ Aguardando pagamento...</strong><br>
                        ${result.message}
                        <br><br>
                        <div style="display: flex; justify-content: center; align-items: center; gap: 12px;">
                            <div style="width:20px;height:20px;border:3px solid #667eea;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
                            <span style="font-size:13px;color:#888;" id="statusPagamento">Aguardando confirmação...</span>
                        </div>
                        <br>
                        <a href="comprar.html" style="display:inline-block;padding:10px 24px;background:#28a745;color:white;border:none;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;transition:0.3s ease;">
                            🔗 Pagar agora
                        </a>
                        <br><br>
                        <button onclick="verificarPagamentoManual('${email}')" style="padding:8px 20px;background:transparent;color:#667eea;border:1.5px solid #667eea;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;transition:0.3s ease;">
                            🔄 Verificar novamente
                        </button>
                        <br>
                        <small style="color:#999;font-size:12px;display:block;margin-top:8px;">
                            Assim que o pagamento for confirmado, você será liberado automaticamente.
                        </small>
                    `;
                    el.style.display = 'block';
                    
                    // 🔴 INICIAR POLLING
                    escutarPagamento(email);
                    
                } else {
                    mostrarResultado('resultadoLogin', false, result.message || 'Erro no login');
                }
            }
        } catch (error) {
            mostrarResultado('resultadoLogin', false, 'Erro de conexão');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Entrar';
        }
    });
}

// ============================================
// MOSTRAR/OCULTAR SENHA
// ============================================
document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', function() {
        const input = this.closest('.password-wrapper').querySelector('input');
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;
    });
});

// ============================================
// PERFIL
// ============================================
async function carregarPerfil() {
    const perfilInfo = document.getElementById('perfilInfo');
    if (!perfilInfo) return;

    if (!tokenAtual) {
        perfilInfo.innerHTML = `<p style="color: #888;">Faça login para ver seus dados</p>`;
        return;
    }

    try {
        const { response, result } = await apiRequest('/validar-token', 'POST');

        if (response.ok && result.valido) {
            const d = result.dados;
            perfilInfo.innerHTML = `
                <div class="dados-usuario">
                    <strong>ID:</strong> ${d.usuario.id}<br>
                    <strong>Nome:</strong> ${d.usuario.nome}<br>
                    <strong>Email:</strong> ${d.usuario.email}<br>
                    <strong>Perfil:</strong> ${d.usuario.perfil}<br>
                    <strong>Expira em:</strong> ${new Date(d.expira_em).toLocaleString()}
                </div>
            `;
        } else {
            localStorage.removeItem('token');
            tokenAtual = null;
            perfilInfo.innerHTML = `<p style="color: #dc3545;">Sessão expirada. Faça login novamente.</p>`;
        }
    } catch (error) {
        perfilInfo.innerHTML = `<p style="color: #dc3545;">Erro ao carregar perfil</p>`;
    }
}

// ============================================
// LOGOUT
// ============================================
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        if (!tokenAtual) return;

        try {
            await apiRequest('/logout', 'POST');
        } catch (error) {}

        localStorage.removeItem('token');
        tokenAtual = null;
        if (intervalCheck) {
            clearInterval(intervalCheck);
            intervalCheck = null;
        }
        window.location.href = 'login.html';
    });
}

// ============================================
// COMPRA DE LOGIN
// ============================================
const formCompra = document.getElementById('formCompra');
if (formCompra) {
    formCompra.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('emailCompra').value.trim();
        const quantidade = parseInt(document.getElementById('quantidade').value) || 1;

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Processando...';

        try {
            const { response, result } = await apiRequest('/comprar', 'POST', {
                email,
                quantidade,
                preco_unitario: PRECO_POR_CONTA
            });

            if (response.ok) {
                mostrarResultado('resultadoCompra', true, 'Compra realizada com sucesso!');
                document.getElementById('formCompra').reset();
                document.getElementById('quantidade').value = 1;
                atualizarTotal();
                setTimeout(() => window.location.href = 'login.html', 3000);
            } else {
                mostrarResultado('resultadoCompra', false, result.message || 'Erro na compra');
            }
        } catch (error) {
            mostrarResultado('resultadoCompra', false, 'Erro de conexão');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Comprar agora';
        }
    });
}

// ============================================
// ATUALIZAR TOTAL (COMPRA)
// ============================================
function atualizarTotal() {
    const precoEl = document.getElementById('precoUnitario');
    const valorTotalEl = document.getElementById('valorTotal');
    const totalPagarEl = document.getElementById('totalPagar');
    const qtdEl = document.getElementById('quantidade');

    if (!precoEl || !valorTotalEl || !totalPagarEl || !qtdEl) return;

    const qtd = parseInt(qtdEl.value) || 1;
    const total = qtd * PRECO_POR_CONTA;
    precoEl.textContent = PRECO_POR_CONTA.toFixed(2).replace('.', ',');
    valorTotalEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    totalPagarEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

// ============================================
// QUANTIDADE MUDOU (COMPRA)
// ============================================
const quantidadeInput = document.getElementById('quantidade');
if (quantidadeInput) {
    quantidadeInput.addEventListener('input', atualizarTotal);
}

// ============================================
// ALTERAR PREÇO (COMPRA)
// ============================================
function alterarPreco() {
    const precoEl = document.getElementById('precoUnitario');
    if (!precoEl) return;

    const precoAtual = PRECO_POR_CONTA.toFixed(2).replace('.', ',');
    const novoPreco = prompt('Digite o novo preço por conta (ex: 7.50):', precoAtual);

    if (novoPreco !== null) {
        const preco = parseFloat(novoPreco.replace(',', '.'));
        if (!isNaN(preco) && preco > 0) {
            window.PRECO_POR_CONTA = preco;
            precoEl.textContent = preco.toFixed(2).replace('.', ',');
            atualizarTotal();
            alert(`Preço alterado para R$ ${preco.toFixed(2).replace('.', ',')}`);
        } else {
            alert('Preço inválido! Digite um valor positivo.');
        }
    }
}

// ============================================
// INICIAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('perfil.html') && tokenAtual) {
        carregarPerfil();
    }

    if (document.getElementById('formCompra')) {
        atualizarTotal();
    }
});