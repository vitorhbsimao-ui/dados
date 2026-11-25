// ---------- 0. Conversa com o servidor (banco de dados) ----------
const CHAVE_SESSAO = "admin-token";

function lerToken() {
    try {
        return sessionStorage.getItem(CHAVE_SESSAO);
    } catch (e) {
        return null;
    }
}

function adminLogado() {
    return !!lerToken();
}

async function api(caminho, opcoes) {
    opcoes = opcoes || {};
    const cabecalhos = { "content-type": "application/json" };
    const token = lerToken();
    if (token) cabecalhos.authorization = "Bearer " + token;

    let resposta;
    try {
        resposta = await fetch(caminho, {
            method: opcoes.metodo || "GET",
            headers: cabecalhos,
            body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined
        });
    } catch (e) {
        return { ok: false, status: 0, dados: null };
    }

    let dados = null;
    try { dados = await resposta.json(); } catch (e) {}

    // login expirou ou token inválido: volta para a tela de login
    if (resposta.status === 401 && token) encerrarSessao();

    return { ok: resposta.ok, status: resposta.status, dados: dados };
}

// ---------- 1. Pegar os elementos da página ----------
const formulario = document.getElementById("formulario");
const mensagem = document.getElementById("mensagem");
const lista = document.getElementById("lista-respostas");
const botaoApagar = document.getElementById("apagar");

// Cada campo com o seu span de erro
const campos = [
    { input: document.getElementById("pergunta1"), erro: document.getElementById("erro1"), texto: "Escolha se você é aluno ou funcionário." },
    { input: document.getElementById("pergunta2"), erro: document.getElementById("erro2"), texto: "Responda se você já presenciou um caso." },
    { input: document.getElementById("pergunta3"), erro: document.getElementById("erro3"), texto: "Escreva pelo menos 10 caracteres." }
];

// ---------- 2. Mostrar as respostas da pesquisa (só para o administrador) ----------
async function mostrarRespostas() {
    lista.innerHTML = "";
    botaoApagar.hidden = true;

    if (!adminLogado()) return;

    const resultado = await api("/api/pesquisa");
    if (!resultado.ok) {
        if (resultado.status !== 401) {
            const erro = document.createElement("li");
            erro.textContent = "Não foi possível carregar as respostas.";
            lista.appendChild(erro);
        }
        return;
    }

    const respostas = resultado.dados;

    if (respostas.length === 0) {
        const vazio = document.createElement("li");
        vazio.textContent = "Nenhuma resposta ainda.";
        lista.appendChild(vazio);
        return;
    }

    botaoApagar.hidden = false;

    respostas.forEach(function (r) {
        const item = document.createElement("li");

        const titulo = document.createElement("strong");
        titulo.textContent = r.respostas.perfil + " — presenciou desacato: " + r.respostas.presenciou;

        const texto = document.createElement("span");
        texto.textContent = r.respostas.solucao;

        const data = document.createElement("small");
        data.textContent = " (" + new Date(r.criado_em).toLocaleDateString("pt-BR") + ")";

        item.append(titulo, texto, data);
        lista.appendChild(item);
    });
}

// ---------- 3. Validação ----------
function validar() {
    let tudoCerto = true;

    campos.forEach(function (c) {
        const valor = c.input.value.trim();
        const minimo = c.input.tagName === "TEXTAREA" ? 10 : 1;
        const ok = valor.length >= minimo;

        c.erro.textContent = ok ? "" : c.texto;
        c.input.classList.toggle("invalido", !ok);
        if (!ok) tudoCerto = false;
    });

    return tudoCerto;
}

// Some o aviso de erro assim que a pessoa corrige o campo
campos.forEach(function (c) {
    c.input.addEventListener("input", function () {
        if (c.input.classList.contains("invalido")) validar();
    });
});

// ---------- 4. Enviar o formulário da pesquisa ----------
formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault(); // impede a página de recarregar

    if (!validar()) {
        mensagem.textContent = "Corrija os campos marcados e envie de novo.";
        return;
    }

    mensagem.textContent = "Enviando...";

    const resultado = await api("/api/pesquisa", {
        metodo: "POST",
        corpo: {
            perfil: campos[0].input.value,
            presenciou: campos[1].input.value,
            solucao: campos[2].input.value.trim()
        }
    });

    if (!resultado.ok) {
        mensagem.textContent = "Não foi possível enviar agora. Tente de novo em instantes.";
        return;
    }

    formulario.reset();
    mensagem.textContent = "Resposta enviada. Obrigado por participar!";
    mostrarRespostas();
});

formulario.addEventListener("reset", function () {
    campos.forEach(function (c) {
        c.erro.textContent = "";
        c.input.classList.remove("invalido");
    });
    mensagem.textContent = "";
});

// ---------- 5. Apagar todas as respostas (administrador) ----------
botaoApagar.addEventListener("click", async function () {
    if (!confirm("Apagar todas as respostas da pesquisa? Isso não pode ser desfeito.")) return;

    const resultado = await api("/api/pesquisa", { metodo: "DELETE" });
    mensagem.textContent = resultado.ok ? "Respostas apagadas." : "Não foi possível apagar.";
    mostrarRespostas();
});

// ---------- 6. Destacar no menu a seção que está na tela ----------
const links = document.querySelectorAll("nav a");
const secoes = document.querySelectorAll("main section");

const observador = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
            links.forEach(function (link) {
                link.classList.toggle("ativo", link.getAttribute("href") === "#" + entrada.target.id);
            });
        }
    });
}, { rootMargin: "-40% 0px -55% 0px" });

secoes.forEach(function (secao) {
    observador.observe(secao);
});

// =====================================================
// PORTAL DE DENÚNCIAS
// =====================================================
const formDenuncia = document.getElementById("form-denuncia");
const msgDenuncia = document.getElementById("mensagem-denuncia");
const listaDenuncias = document.getElementById("lista-denuncias");
const botaoApagarDenuncias = document.getElementById("apagar-denuncias");

const blocoIdentidade = document.getElementById("den-bloco-identidade");
const blocoLocal = document.getElementById("den-bloco-local");
const selectLocal = document.getElementById("den-local");
const inputData = document.getElementById("den-data");
const radiosIdentidade = document.querySelectorAll('input[name="identidade"]');

function campo(id, texto, minimo, ativo) {
    return {
        input: document.getElementById(id),
        erro: document.getElementById("erro-" + id),
        texto: texto,
        minimo: minimo,
        ativo: ativo || function () { return true; }
    };
}

const camposDen = [
    campo("den-nome", "Informe seu nome ou escolha denunciar anonimamente.", 3, function () { return identidadeEscolhida() === "identificada"; }),
    campo("den-data", "Informe a data do ocorrido.", 1),
    campo("den-hora", "Informe o horário aproximado.", 1),
    campo("den-local", "Escolha o local.", 1),
    campo("den-local-outro", "Diga qual foi o local.", 2, function () { return selectLocal.value === "Outro"; }),
    campo("den-acusado", "Diga quem cometeu o desacato.", 2),
    campo("den-vinculo", "Escolha quem é essa pessoa.", 1),
    campo("den-descricao", "Descreva o que aconteceu (mínimo de 20 caracteres).", 20)
];

function identidadeEscolhida() {
    return document.querySelector('input[name="identidade"]:checked').value;
}

function hojeLocal() {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + mes + "-" + dia;
}

// não permite data no futuro
inputData.max = hojeLocal();

function formatarData(iso) {
    const partes = iso.split("-");
    return partes[2] + "/" + partes[1] + "/" + partes[0];
}

// ---------- Mostrar ou esconder campos ----------
function atualizarBlocos() {
    blocoIdentidade.hidden = identidadeEscolhida() !== "identificada";
    blocoLocal.hidden = selectLocal.value !== "Outro";
}

radiosIdentidade.forEach(function (r) { r.addEventListener("change", atualizarBlocos); });
selectLocal.addEventListener("change", atualizarBlocos);

// ---------- Mostrar as denúncias (só para o administrador) ----------
function linha(rotulo, valor) {
    const p = document.createElement("p");
    const b = document.createElement("b");
    b.textContent = rotulo + ": ";
    p.append(b, document.createTextNode(valor));
    return p;
}

async function mostrarDenuncias() {
    listaDenuncias.innerHTML = "";
    botaoApagarDenuncias.hidden = true;

    // sem login, nada é pedido ao servidor e nada aparece na página
    if (!adminLogado()) return;

    const resultado = await api("/api/denuncias");
    if (!resultado.ok) {
        if (resultado.status !== 401) {
            const erro = document.createElement("li");
            erro.textContent = "Não foi possível carregar as denúncias.";
            listaDenuncias.appendChild(erro);
        }
        return;
    }

    const denuncias = resultado.dados;

    if (denuncias.length === 0) {
        const vazio = document.createElement("li");
        vazio.textContent = "Nenhuma denúncia registrada ainda.";
        listaDenuncias.appendChild(vazio);
        return;
    }

    botaoApagarDenuncias.hidden = false;

    denuncias.forEach(function (d) {
        const item = document.createElement("li");

        const titulo = document.createElement("strong");
        titulo.textContent = "Protocolo " + d.protocolo + " — " +
            (d.anonima ? "Denúncia anônima" : "Denúncia de " + d.nome);
        item.appendChild(titulo);

        if (!d.anonima && d.contato) item.appendChild(linha("Contato", d.contato));
        item.appendChild(linha("Data e horário", formatarData(d.data) + " às " + d.hora));
        item.appendChild(linha("Local", d.local));
        item.appendChild(linha("Pessoa denunciada", d.acusado + " (" + d.vinculo + ")"));
        item.appendChild(linha("Relato", d.descricao));

        listaDenuncias.appendChild(item);
    });
}

// ---------- Validação ----------
function validarDenuncia() {
    let tudoCerto = true;

    camposDen.forEach(function (c) {
        let ok = true;
        if (c.ativo()) {
            ok = c.input.value.trim().length >= c.minimo;
        }
        c.erro.textContent = ok ? "" : c.texto;
        c.input.classList.toggle("invalido", !ok);
        if (!ok) tudoCerto = false;
    });

    return tudoCerto;
}

camposDen.forEach(function (c) {
    c.input.addEventListener("input", function () {
        if (c.input.classList.contains("invalido")) validarDenuncia();
    });
});

// ---------- Enviar ----------
function valor(id) {
    return document.getElementById(id).value.trim();
}

formDenuncia.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    if (!validarDenuncia()) {
        msgDenuncia.textContent = "Corrija os campos marcados e envie de novo.";
        return;
    }

    const anonima = identidadeEscolhida() === "anonima";
    const local = selectLocal.value === "Outro" ? valor("den-local-outro") : selectLocal.value;

    msgDenuncia.textContent = "Enviando...";

    const resultado = await api("/api/denuncias", {
        metodo: "POST",
        corpo: {
            anonima: anonima,
            nome: anonima ? "" : valor("den-nome"),
            contato: anonima ? "" : valor("den-contato"),
            data: valor("den-data"),
            hora: valor("den-hora"),
            local: local,
            acusado: valor("den-acusado"),
            vinculo: valor("den-vinculo"),
            descricao: valor("den-descricao")
        }
    });

    if (!resultado.ok) {
        msgDenuncia.textContent = (resultado.dados && resultado.dados.erro) ||
            "Não foi possível enviar agora. Tente de novo em instantes.";
        return;
    }

    formDenuncia.reset();
    atualizarBlocos();
    msgDenuncia.textContent = "Denúncia registrada. Guarde o protocolo: " + resultado.dados.protocolo + ".";
    mostrarDenuncias();
});

formDenuncia.addEventListener("reset", function () {
    camposDen.forEach(function (c) {
        c.erro.textContent = "";
        c.input.classList.remove("invalido");
    });
    msgDenuncia.textContent = "";
    // o reset volta para "anonimamente" depois do evento
    setTimeout(atualizarBlocos, 0);
});

botaoApagarDenuncias.addEventListener("click", async function () {
    if (!confirm("Apagar TODAS as denúncias? Isso não pode ser desfeito.")) return;

    const resultado = await api("/api/denuncias", { metodo: "DELETE" });
    msgDenuncia.textContent = resultado.ok ? "Denúncias apagadas." : "Não foi possível apagar.";
    mostrarDenuncias();
});

atualizarBlocos();

// =====================================================
// LOGIN DO ADMINISTRADOR (conferido no servidor)
// =====================================================
const formLogin = document.getElementById("form-login");
const erroLogin = document.getElementById("erro-login");
const blocoLogin = document.getElementById("admin-login");
const painelAdmin = document.getElementById("admin-painel");
const botaoSair = document.getElementById("sair");

let tentativas = 0;
let bloqueadoAte = 0;

function atualizarAdmin() {
    const logado = adminLogado();
    blocoLogin.hidden = logado;
    painelAdmin.hidden = !logado;
    mostrarDenuncias();
    mostrarRespostas();
}

function encerrarSessao() {
    try {
        sessionStorage.removeItem(CHAVE_SESSAO);
    } catch (e) {}
    atualizarAdmin();
}

formLogin.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const agora = Date.now();
    if (agora < bloqueadoAte) {
        const falta = Math.ceil((bloqueadoAte - agora) / 1000);
        erroLogin.textContent = "Muitas tentativas. Aguarde " + falta + " segundos.";
        return;
    }

    const usuario = document.getElementById("login-usuario").value.trim();
    const senha = document.getElementById("login-senha").value;

    const resultado = await api("/api/admin-login", {
        metodo: "POST",
        corpo: { usuario: usuario, senha: senha }
    });

    if (resultado.ok) {
        try {
            sessionStorage.setItem(CHAVE_SESSAO, resultado.dados.token);
        } catch (e) {
            erroLogin.textContent = "Não foi possível iniciar a sessão neste navegador.";
            return;
        }
        tentativas = 0;
        erroLogin.textContent = "";
        formLogin.reset();
        atualizarAdmin();
        return;
    }

    tentativas++;
    document.getElementById("login-senha").value = "";

    if (resultado.status === 0) {
        erroLogin.textContent = "Sem conexão com o servidor. Tente de novo.";
    } else if (tentativas >= 3) {
        tentativas = 0;
        bloqueadoAte = Date.now() + 30000;
        erroLogin.textContent = "Muitas tentativas. Aguarde 30 segundos.";
    } else {
        erroLogin.textContent = "Usuário ou senha incorretos.";
    }
});

botaoSair.addEventListener("click", function () {
    erroLogin.textContent = "";
    encerrarSessao();
});

// Estado inicial: sem login, nada de denúncias nem de respostas na tela
atualizarAdmin();
