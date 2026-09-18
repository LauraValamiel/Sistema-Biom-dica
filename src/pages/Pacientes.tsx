import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
// @ts-ignore
import html2pdf from 'html2pdf.js';

// --- TIPAGENS ---
type Paciente = { id: string; nome_completo: string; cpf: string; rg: string; data_nascimento: string; telefone: string; email: string; endereco: string; data_cadastro: string; };
type Campo = { id: string; label: string; tipo: string; opcoes?: string[] };
type Secao = { titulo: string; campos: Campo[] };
type ModeloFicha = { id: string; titulo: string; campos: Secao[] };
type ModeloTermo = { id: string; titulo: string; conteudo: string; campos: Campo[] };
type Midia = { id: string; paciente_id: string; url_arquivo: string; categoria: 'Antes' | 'Durante' | 'Depois'; procedimento: string; data_registro: string; observacoes: string; };

export default function Pacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'dados' | 'anamneses' | 'documentos' | 'midias'>('dados');
  
  const [form, setForm] = useState<Partial<Paciente>>({});

  const [modelosFichas, setModelosFichas] = useState<ModeloFicha[]>([]);
  const [modelosTermos, setModelosTermos] = useState<ModeloTermo[]>([]);
  const [historicoAnamneses, setHistoricoAnamneses] = useState<any[]>([]);
  const [historicoDocumentos, setHistoricoDocumentos] = useState<any[]>([]);
  
  // Fluxos Fichas
  const [fluxoAnamnese, setFluxoAnamnese] = useState<'lista' | 'selecao' | 'preenchendo'>('lista');
  const [fichaSelecionada, setFichaSelecionada] = useState<ModeloFicha | null>(null);
  const [fichaPreenchidaId, setFichaPreenchidaId] = useState<string | null>(null);
  const [respostasAtuais, setRespostasAtuais] = useState<Record<string, any>>({});
  
  // Fluxos Documentos
  const [fluxoDocumento, setFluxoDocumento] = useState<'lista' | 'selecao' | 'preenchendo'>('lista');
  const [termoSelecionado, setTermoSelecionado] = useState<ModeloTermo | null>(null);
  const [termoPreenchidoId, setTermoPreenchidoId] = useState<string | null>(null);
  const [respostasTermo, setRespostasTermo] = useState<Record<string, any>>({});
  const [autorizacaoTermo, setAutorizacaoTermo] = useState<'Sim' | 'Não' | null>(null);
  const [cidadeTermo, setCidadeTermo] = useState('João Monlevade - MG');
  
  // Fluxos Mídias
  const [historicoMidias, setHistoricoMidias] = useState<Midia[]>([]);
  const [fluxoMidia, setFluxoMidia] = useState<'lista' | 'upload'>('lista');
  const [arquivoMidia, setArquivoMidia] = useState<File | null>(null);
  const [uploadingMidia, setUploadingMidia] = useState(false);
  const [formMidia, setFormMidia] = useState({ categoria: 'Antes', procedimento: '', data_registro: new Date().toISOString().split('T')[0], observacoes: '' });

  // Autenticação
  const [dataAssinatura, setDataAssinatura] = useState(new Date().toISOString().split('T')[0]);
  const [termoAceito, setTermoAceito] = useState(false);
  const [cpfAssinatura, setCpfAssinatura] = useState('');
  const [profAceito, setProfAceito] = useState(false);
  const [registroProfissional, setRegistroProfissional] = useState('');

  // Controle Visual do PDF
  const [gerandoPdf, setGerandoPdf] = useState(false);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasClienteRef = useRef<HTMLCanvasElement>(null);
  const canvasProfRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDrawingCliente, setIsDrawingCliente] = useState(false);
  const [isDrawingProf, setIsDrawingProf] = useState(false);

  // --- MÁSCARAS E FUNÇÕES AUXILIARES ---
  const formatarCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
  const formatarTelefone = (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{4})\d+?$/, '$1');

  const formatarTextoTermo = (texto: string) => texto.split(/\\n|\n/).map((linha, idx) => {
    if (linha.trim() === '') return <br key={idx} />;
    const isHeader = linha === linha.toUpperCase() && linha.length > 5 && !linha.includes('(');
    return <p key={idx} className={`mb-2 leading-relaxed ${isHeader ? 'font-bold text-[#B68B40] mt-6 text-sm tracking-wider uppercase' : 'text-gray-700 text-sm text-justify'}`}>{linha}</p>;
  });

  const obterTextoDeclaracao = (titulo: string) => {
    if (titulo.includes('Facial')) return "Declaro que todas as informações fornecidas nesta ficha são verdadeiras e completas, estando ciente de que a omissão de informações poderá comprometer a segurança e os resultados do tratamento.\n\nDeclaro ainda que fui orientado(a) sobre o protocolo proposto, compreendendo que os procedimentos estéticos isoladamente não garantem os resultados esperados. Estou ciente de que o sucesso do tratamento depende também da realização correta dos cuidados domiciliares, do uso dos produtos indicados, da frequência das sessões e do cumprimento integral do protocolo personalizado estabelecido pela profissional.\n\nConfirmo que todas as minhas dúvidas foram esclarecidas e autorizo o início do tratamento conforme avaliação profissional.";
    if (titulo.includes('Corporal')) return "Declaro que as informações prestadas são verdadeiras e estou ciente dos procedimentos propostos.";
    if (titulo.includes('Lipo Enzimática') || titulo.includes('Microagulhamento') || titulo.includes('Toxina')) return `Declaro que as informações acima são verdadeiras e que não omiti qualquer informação importante sobre minha saúde. Fui informada sobre o procedimento de ${titulo.replace('Anamnese - ', '').toLowerCase()}, seus benefícios, riscos, contraindicações e cuidados necessários.`;
    return "Declaro que as informações acima são verdadeiras e que não omiti qualquer informação importante sobre minha saúde.";
  };

  // --- GERADOR DE PDF ---
  const baixarPDF = async (tipo: 'ficha' | 'termo', item: any) => {
    setGerandoPdf(true);
    const tituloDoc = tipo === 'ficha' ? item.historico_medico?.tipo_ficha : item.tipo_documento;
    const nomeArquivo = `${form.nome_completo} - ${tituloDoc}.pdf`;

    let html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #222; line-height: 1.4; font-size: 11px; width: 100%; max-width: 800px; margin: 0 auto; background: white;">
        <style>
          * { box-sizing: border-box; }
          .header { text-align: center; margin-bottom: 25px; width: 100%; }
          .header img { display: block; margin: 0 auto 12px auto; width: 170px; }
          .contact-info { color: #B68B40; font-size: 11px; margin-bottom: 20px; font-weight: 500; text-align: center; }
          .title-container { display: table; width: 100%; margin-bottom: 25px; }
          .title-line { display: table-cell; width: 35%; border-bottom: 1.5px solid rgba(182, 139, 64, 0.3); vertical-align: middle; }
          .title-text { display: table-cell; width: 30%; color: #222; font-size: 14px; font-weight: bold; text-transform: uppercase; text-align: center; letter-spacing: 1.5px; white-space: nowrap; vertical-align: middle; padding: 0 10px; }
          .dot { color: #B68B40; font-size: 16px; margin: 0 4px; vertical-align: middle; }
          .avoid-cut { page-break-inside: avoid !important; break-inside: avoid !important; display: block !important; }
          .section-box { border: 1.5px solid #D4B872; border-radius: 8px; padding: 15px; margin-bottom: 15px; position: relative; background: white; }
          .section-title { color: #B68B40; text-transform: uppercase; font-weight: bold; font-size: 12px; position: absolute; top: -9px; left: 15px; background: white; padding: 0 8px; letter-spacing: 0.5px; }
          .row { width: 100%; display: block; margin-bottom: 15px; }
          .col-left { float: left; width: 48.5%; }
          .col-right { float: right; width: 48.5%; }
          .clear { clear: both; width: 100%; height: 0; }
          .info-table { width: 100%; border-collapse: separate; border-spacing: 10px 5px; margin-top: 5px; }
          .info-table td { border-bottom: 1px dotted #ccc; padding-bottom: 4px; vertical-align: bottom; }
          .label { color: #555; font-size: 10px; text-transform: uppercase; margin-right: 5px; }
          .val { font-weight: bold; color: #111; font-size: 11px; }
          .qa-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          .qa-table td { border-bottom: 1px dotted #e5e7eb; padding: 6px 0; vertical-align: bottom; }
          .question { color: #333; font-size: 10px; padding-right: 15px; }
          .answer { text-align: right; font-weight: bold; font-size: 10px; color: #B68B40; text-transform: uppercase; width: 30%; }
          .answer-long { font-weight: 500; color: #222; font-size: 11px; padding-top: 4px; display: block; }
          .termo-content { white-space: pre-wrap; text-align: justify; font-size: 10.5px; line-height: 1.6; color: #333; margin-top: 8px; }
          .signatures { display: table; width: 100%; margin-top: 25px; }
          .sig-box { display: table-cell; text-align: center; width: 50%; padding: 0 20px; }
          .sig-line { border-bottom: 1px solid #333; height: 60px; margin-bottom: 5px; text-align: center; vertical-align: bottom; display: table-cell; width: 100%; }
          .sig-img { max-height: 55px; max-width: 100%; object-fit: contain; vertical-align: bottom; }
          .sig-name { font-weight: bold; font-size: 11px; margin: 5px 0 0 0; }
          .sig-role { font-size: 9px; margin: 0; color: #666; }
          .legal-hash { font-family: monospace; font-size: 8px; color: #777; margin-top: 20px; text-align: center; padding-top: 10px; border-top: 1px dashed #ccc; }
        </style>
        
        <div class="header avoid-cut">
          <img src="${window.location.origin}/logo.jpeg" onerror="this.style.display='none'" />
          <div class="contact-info">📞 (31) 97224-1476 &nbsp;&nbsp;|&nbsp;&nbsp; 📷 dra.emilybarcelos</div>
          <div class="title-container">
            <div class="title-line"></div>
            <div class="title-text"><span class="dot">•</span> ${tituloDoc} <span class="dot">•</span></div>
            <div class="title-line"></div>
          </div>
        </div>
        
        <div class="section-box avoid-cut" style="margin-bottom: 20px;">
          <div class="section-title">DADOS PESSOAIS</div>
          <table class="info-table">
            <tr>
              <td colspan="2"><span class="label">Nome:</span> <span class="val">${form.nome_completo}</span></td>
              <td colspan="1"><span class="label">Nascimento:</span> <span class="val">${form.data_nascimento ? new Date(form.data_nascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : ''}</span></td>
            </tr>
            <tr>
              <td colspan="1" style="width: 40%;"><span class="label">CPF:</span> <span class="val">${form.cpf || ''}</span></td>
              <td colspan="2"><span class="label">RG:</span> <span class="val">${form.rg || ''}</span></td>
            </tr>
            <tr>
              <td colspan="1"><span class="label">Telefone:</span> <span class="val">${form.telefone || ''}</span></td>
              <td colspan="2"><span class="label">E-mail:</span> <span class="val">${form.email || ''}</span></td>
            </tr>
            <tr>
              <td colspan="3"><span class="label">Endereço:</span> <span class="val">${form.endereco || ''}</span></td>
            </tr>
          </table>
        </div>
    `;

    if (tipo === 'ficha') {
      const respostas = item.historico_medico.respostas || {};
      const modelo = modelosFichas.find(m => m.titulo === item.historico_medico.tipo_ficha);
      
      if (modelo && modelo.campos) {
        for (let i = 0; i < modelo.campos.length; i += 2) {
          const secaoEsq = modelo.campos[i];
          const secaoDir = modelo.campos[i + 1];

          html += `<div class="row avoid-cut">`;
          
          html += `<div class="col-left">
            <div class="section-box" style="margin-bottom: 0;">
              <div class="section-title">${secaoEsq.titulo}</div>
              <table class="qa-table">
          `;
          secaoEsq.campos?.forEach(c => {
             let resp = respostas[c.id];
             if (Array.isArray(resp)) resp = resp.join(', ');
             else if (resp === true) resp = 'Sim';
             else if (resp === false) resp = 'Não';
             if (!resp && resp !== false) resp = '---';
             if (c.tipo === 'textarea' || (typeof resp === 'string' && resp.length > 30)) { html += `<tr><td colspan="2"><div class="question" style="width:100%;">${c.label}</div><div class="answer-long">${resp}</div></td></tr>`; } else { html += `<tr><td class="question">${c.label}</td><td class="answer">${resp}</td></tr>`; }
          });
          html += `</table></div></div>`;

          if (secaoDir) {
            html += `<div class="col-right">
              <div class="section-box" style="margin-bottom: 0;">
                <div class="section-title">${secaoDir.titulo}</div>
                <table class="qa-table">
            `;
            secaoDir.campos?.forEach(c => {
               let resp = respostas[c.id];
               if (Array.isArray(resp)) resp = resp.join(', ');
               else if (resp === true) resp = 'Sim';
               else if (resp === false) resp = 'Não';
               if (!resp && resp !== false) resp = '---';
               if (c.tipo === 'textarea' || (typeof resp === 'string' && resp.length > 30)) { html += `<tr><td colspan="2"><div class="question" style="width:100%;">${c.label}</div><div class="answer-long">${resp}</div></td></tr>`; } else { html += `<tr><td class="question">${c.label}</td><td class="answer">${resp}</td></tr>`; }
            });
            html += `</table></div></div>`;
          }
          
          html += `<div class="clear"></div></div>`;
        }
      }
      
      html += `
        <div class="avoid-cut">
          <div class="section-box" style="margin-top: 5px;">
            <div class="section-title">DECLARAÇÃO</div>
            <div class="termo-content">${obterTextoDeclaracao(item.historico_medico.tipo_ficha)}</div>
            
            <table class="info-table" style="margin-top: 15px;">
              <tr><td><span class="label">Data:</span> <span class="val">${item.historico_medico.data_assinatura ? new Date(item.historico_medico.data_assinatura).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : ''}</span></td></tr>
            </table>
            
            <div class="signatures">
              <div class="sig-box" style="width: 100%;">
                <div class="sig-line">
                  ${item.historico_medico.assinatura_desenho ? `<img src="${item.historico_medico.assinatura_desenho}" class="sig-img" />` : ''}
                </div>
                <p class="sig-name">${form.nome_completo}</p>
                <p class="sig-role">Assinatura do(a) Paciente</p>
              </div>
            </div>
          </div>
      `;

      if (item.historico_medico.assinatura_eletronica) {
         const auth = item.historico_medico.assinatura_eletronica;
         html += `<div class="legal-hash"><strong>🔒 AUTENTICAÇÃO ELETRÔNICA (MP 2.200-2/2001)</strong><br/>Data/Hora: ${new Date(auth.data_hora_assinatura).toLocaleString('pt-BR')} | IP: ${auth.ip_dispositivo} | CPF Autenticado: ${auth.cpf_assinante}<br/>Hash SHA-256: ${auth.hash_autenticacao}</div>`;
      }
      html += `</div>`;

    } else {
       const docs = item.url_documento_assinado;
       const modeloOriginal = modelosTermos.find(m => m.titulo === item.tipo_documento);
       
       html += `<div class="section-box" style="margin-top: 10px;"><div class="section-title">TERMO DE CONSENTIMENTO</div><div class="termo-content">${docs.texto_acordado}</div></div><div class="avoid-cut"><div class="section-box">`;
       
       if (docs.respostas_extras && Object.keys(docs.respostas_extras).length > 0) {
           html += `<table class="info-table" style="margin-top:5px; margin-bottom: 15px;">`;
           for(let key in docs.respostas_extras) { let label = key; modeloOriginal?.campos?.forEach(c => { if(c.id === key) label = c.label; }); html += `<tr><td><span class="label">${label}:</span> <span class="val">${docs.respostas_extras[key]}</span></td></tr>`; }
           html += `</table>`;
       }

       html += `<div style="margin-top:10px; padding: 12px; border: 1.5px solid #D4B872; border-radius: 6px; text-align: center; background: #fffcf5; font-size: 11px; letter-spacing: 0.5px; color: #B68B40;"><strong>${docs.autorizacao === 'Sim' ? '✓ AUTORIZO' : '✗ NÃO AUTORIZO'} A REALIZAÇÃO DO PROCEDIMENTO E/OU USO DE MINHA IMAGEM</strong></div><table class="info-table" style="margin-top: 15px;"><tr><td style="width: 70%;"><span class="label">Cidade:</span> <span class="val">${docs.cidade}</span></td><td style="width: 30%;"><span class="label">Data:</span> <span class="val">${new Date(docs.data_assinatura).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span></td></tr></table><div class="signatures"><div class="sig-box"><div class="sig-line">${docs.assinatura_cliente_desenho ? `<img src="${docs.assinatura_cliente_desenho}" class="sig-img" />` : ''}</div><p class="sig-name">${form.nome_completo}</p><p class="sig-role">Assinatura do(a) Paciente</p></div><div class="sig-box"><div class="sig-line">${docs.assinatura_profissional_desenho ? `<img src="${docs.assinatura_profissional_desenho}" class="sig-img" />` : ''}</div><p class="sig-name">Dra. Emily Barcelos</p><p class="sig-role">Biomédica Esteta</p></div></div></div>`;

       if (docs.assinatura_eletronica) {
         const auth = docs.assinatura_eletronica;
         html += `<div class="legal-hash"><strong>🔒 AUTENTICAÇÃO DUPLA (MP 2.200-2/2001)</strong><br/>Data/Hora: ${new Date(auth.data_hora_assinatura).toLocaleString('pt-BR')} | IP: ${auth.ip_dispositivo}<br/>CPF Paciente: ${auth.cpf_paciente} | Reg. Profissional: ${auth.registro_profissional}<br/>Hash SHA-256: ${auth.hash_autenticacao}</div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;

    const opt = { margin: 15, filename: nomeArquivo, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: 'css', avoid: '.avoid-cut' } };
    try { await html2pdf().set(opt).from(html).save(); } catch (error) { alert("Ocorreu um erro ao gerar o arquivo PDF. Tente novamente."); } finally { setGerandoPdf(false); }
  };

  // --- CANVA DESENHO E RESTO DAS FUNÇÕES GERAIS ---
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => { setIsDrawing(true); const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return; const rect = canvasRef.current!.getBoundingClientRect(); const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX; const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY; ctx.beginPath(); ctx.moveTo(clientX - rect.left, clientY - rect.top); };
  const draw = (e: React.MouseEvent | React.TouchEvent) => { if (!isDrawing) return; const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return; const rect = canvasRef.current!.getBoundingClientRect(); const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX; const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY; ctx.lineTo(clientX - rect.left, clientY - rect.top); ctx.stroke(); };
  const stopDrawing = () => setIsDrawing(false);
  const limparAssinatura = () => canvasRef.current?.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  const getImgCanvas = () => canvasRef.current?.toDataURL('image/png') || null;

  const startDrawingTermo = (e: React.MouseEvent | React.TouchEvent, tipo: 'cliente' | 'prof') => { const isCliente = tipo === 'cliente'; isCliente ? setIsDrawingCliente(true) : setIsDrawingProf(true); const canvas = isCliente ? canvasClienteRef.current : canvasProfRef.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return; const rect = canvas.getBoundingClientRect(); const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX; const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY; ctx.beginPath(); ctx.moveTo(clientX - rect.left, clientY - rect.top); };
  const drawTermo = (e: React.MouseEvent | React.TouchEvent, tipo: 'cliente' | 'prof') => { const isDrawingTermo = tipo === 'cliente' ? isDrawingCliente : isDrawingProf; if (!isDrawingTermo) return; const canvas = tipo === 'cliente' ? canvasClienteRef.current : canvasProfRef.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return; const rect = canvas.getBoundingClientRect(); const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX; const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY; ctx.lineTo(clientX - rect.left, clientY - rect.top); ctx.stroke(); };
  const stopDrawingTermo = (tipo: 'cliente' | 'prof') => tipo === 'cliente' ? setIsDrawingCliente(false) : setIsDrawingProf(false);
  const limparCanvasTermo = (tipo: 'cliente' | 'prof') => { const canvas = tipo === 'cliente' ? canvasClienteRef.current : canvasProfRef.current; canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height); };
  const getImgCanvasTermo = (ref: React.RefObject<HTMLCanvasElement>) => ref.current?.toDataURL('image/png') || null;

  useEffect(() => { buscarPacientes(); buscarModelosDisponiveis(); }, []);

  const buscarPacientes = async () => { setLoading(true); const { data } = await supabase.from('pacientes').select('*'); if (data) setPacientes(data); setLoading(false); };
  const buscarModelosDisponiveis = async () => { const { data: fichas } = await supabase.from('modelos_fichas').select('*').order('titulo', { ascending: true }); if (fichas) setModelosFichas(fichas); const { data: termos } = await supabase.from('modelos_termos').select('*').order('titulo', { ascending: true }); if (termos) setModelosTermos(termos); };
  const buscarHistoricoPaciente = async (pacienteId: string) => { const { data: anamneses } = await supabase.from('fichas_anamnese').select('*').eq('paciente_id', pacienteId).order('created_at', { ascending: false }); if (anamneses) setHistoricoAnamneses(anamneses); const { data: documentos } = await supabase.from('documentos_legais').select('*').eq('paciente_id', pacienteId).order('created_at', { ascending: false }); if (documentos) setHistoricoDocumentos(documentos); const { data: midiasData } = await supabase.from('paciente_midias').select('*').eq('paciente_id', pacienteId).order('data_registro', { ascending: false }); if (midiasData) setHistoricoMidias(midiasData); };
  
  const salvarPaciente = async () => { if (!form.nome_completo) return alert('Nome obrigatório!'); const payload = { nome_completo: form.nome_completo, cpf: form.cpf || null, rg: form.rg || null, data_nascimento: form.data_nascimento || null, telefone: form.telefone || null, email: form.email || null, endereco: form.endereco || null }; if (isEditing && form.id) { await supabase.from('pacientes').update(payload).eq('id', form.id); buscarPacientes(); alert('Atualizado com sucesso!'); } else { const { data } = await supabase.from('pacientes').insert([{ ...payload, data_cadastro: new Date().toISOString() }]).select().single(); if (data) { buscarPacientes(); setForm(data); setIsEditing(true); alert('Cadastrado com sucesso!'); } } };

  const deletarPaciente = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Tem a certeza que deseja eliminar este paciente e todo o seu histórico? Esta ação é irreversível.')) {
      const { error } = await supabase.from('pacientes').delete().eq('id', id);
      if (error) { alert('Erro ao eliminar paciente: ' + error.message); } else { setPacientes(prev => prev.filter(p => p.id !== id)); }
    }
  };

  const gerarAssinaturaEletronica = async (dupla = false) => { if (!termoAceito) { alert("O Paciente precisa aceitar os termos."); return null; } if (cpfAssinatura.length < 14) { alert("CPF do Paciente incompleto."); return null; } if (dupla) { if (!profAceito) { alert("A Profissional precisa aceitar."); return null; } if (registroProfissional.length < 4) { alert("Registro da Profissional incompleto."); return null; } } let ip = 'IP não identificado'; try { const response = await fetch('https://api.ipify.org?format=json'); const data = await response.json(); ip = data.ip; } catch (e) {} const userAgent = navigator.userAgent; const dataHora = new Date().toISOString(); const stringParaHash = dupla ? `PACIENTE:${cpfAssinatura}-PROF:${registroProfissional}-${dataHora}-${ip}-${userAgent}` : `${cpfAssinatura}-${dataHora}-${ip}-${userAgent}`; const msgBuffer = new TextEncoder().encode(stringParaHash); const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer); const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join(''); return { tipo: dupla ? 'eletronica_avancada_dupla' : 'eletronica_avancada', cpf_assinante: cpfAssinatura, cpf_paciente: cpfAssinatura, registro_profissional: registroProfissional, ip_dispositivo: ip, user_agent: userAgent, data_hora_assinatura: dataHora, hash_autenticacao: hashHex }; };
  const iniciarNovaFicha = (modelo: ModeloFicha) => { setFichaSelecionada(modelo); setRespostasAtuais({}); setDataAssinatura(new Date().toISOString().split('T')[0]); setFichaPreenchidaId(null); setTermoAceito(false); setCpfAssinatura(form.cpf || ''); setProfAceito(false); setRegistroProfissional(''); setFluxoAnamnese('preenchendo'); setTimeout(limparAssinatura, 100); };
  const editarFichaSalva = (fichaSalva: any) => { const modeloOriginal = modelosFichas.find(m => m.titulo === fichaSalva.historico_medico?.tipo_ficha); if (!modeloOriginal) return alert('Modelo não encontrado.'); setFichaSelecionada(modeloOriginal); setRespostasAtuais(fichaSalva.historico_medico?.respostas || {}); setDataAssinatura(fichaSalva.historico_medico?.data_assinatura || new Date().toISOString().split('T')[0]); setFichaPreenchidaId(fichaSalva.id); setTermoAceito(false); setCpfAssinatura(form.cpf || ''); setProfAceito(false); setRegistroProfissional(''); setFluxoAnamnese('preenchendo'); setTimeout(() => { const ctx = canvasRef.current?.getContext('2d'); if (fichaSalva.historico_medico?.assinatura_desenho && ctx) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0); img.src = fichaSalva.historico_medico.assinatura_desenho; } else limparAssinatura(); }, 150); };
  const excluirFichaSalva = async (id: string) => { if (window.confirm('Excluir esta ficha?')) { await supabase.from('fichas_anamnese').delete().eq('id', id); setHistoricoAnamneses(prev => prev.filter(f => f.id !== id)); } };
  const salvarFichaAnamnese = async () => { const imgDesenho = getImgCanvas(); const dadosAssinatura = await gerarAssinaturaEletronica(false); if (!dadosAssinatura) return; const payload = { paciente_id: form.id, historico_medico: { tipo_ficha: fichaSelecionada?.titulo, respostas: respostasAtuais, assinatura_desenho: imgDesenho, assinatura_eletronica: dadosAssinatura, data_assinatura: dataAssinatura, data_preenchimento: new Date().toISOString() } }; if (fichaPreenchidaId) { const { data } = await supabase.from('fichas_anamnese').update(payload).eq('id', fichaPreenchidaId).select().single(); if (data) { setHistoricoAnamneses(prev => prev.map(f => f.id === fichaPreenchidaId ? data : f)); setFluxoAnamnese('lista'); } } else { const { data } = await supabase.from('fichas_anamnese').insert([payload]).select().single(); if (data) { setHistoricoAnamneses(prev => [data, ...prev]); setFluxoAnamnese('lista'); } } };

  const iniciarNovoTermo = (modelo: ModeloTermo) => { setTermoSelecionado(modelo); setRespostasTermo({}); setAutorizacaoTermo(null); setCidadeTermo('João Monlevade - MG'); setDataAssinatura(new Date().toISOString().split('T')[0]); setTermoPreenchidoId(null); setTermoAceito(false); setCpfAssinatura(form.cpf || ''); setProfAceito(false); setRegistroProfissional(''); setFluxoDocumento('preenchendo'); setTimeout(() => { limparCanvasTermo('cliente'); limparCanvasTermo('prof'); }, 100); };
  const editarTermoSalvo = (termoSalvo: any) => { const modeloOriginal = modelosTermos.find(m => m.titulo === termoSalvo.tipo_documento); if (!modeloOriginal) return alert('Modelo não encontrado.'); const docs = termoSalvo.url_documento_assinado; setTermoSelecionado(modeloOriginal); setRespostasTermo(docs.respostas_extras || {}); setAutorizacaoTermo(docs.autorizacao || null); setCidadeTermo(docs.cidade || 'João Monlevade - MG'); setDataAssinatura(docs.data_assinatura || new Date().toISOString().split('T')[0]); setTermoPreenchidoId(termoSalvo.id); setTermoAceito(false); setCpfAssinatura(form.cpf || ''); setProfAceito(false); setRegistroProfissional(''); setFluxoDocumento('preenchendo'); setTimeout(() => { const ctxC = canvasClienteRef.current?.getContext('2d'); const ctxP = canvasProfRef.current?.getContext('2d'); if (docs.assinatura_cliente_desenho && ctxC) { const img = new Image(); img.onload = () => ctxC.drawImage(img, 0, 0); img.src = docs.assinatura_cliente_desenho; } else limparCanvasTermo('cliente'); if (docs.assinatura_profissional_desenho && ctxP) { const img = new Image(); img.onload = () => ctxP.drawImage(img, 0, 0); img.src = docs.assinatura_profissional_desenho; } else limparCanvasTermo('prof'); }, 150); };
  const excluirTermoSalvo = async (id: string) => { if (window.confirm('Excluir termo?')) { await supabase.from('documentos_legais').delete().eq('id', id); setHistoricoDocumentos(prev => prev.filter(d => d.id !== id)); } };
  const salvarDocumentoTermo = async () => { if (!autorizacaoTermo) return alert("Marque se AUTORIZA ou NÃO AUTORIZA."); const imgCliente = getImgCanvasTermo(canvasClienteRef); const imgProf = getImgCanvasTermo(canvasProfRef); const dadosAssinatura = await gerarAssinaturaEletronica(true); if (!dadosAssinatura) return; const payload = { paciente_id: form.id, tipo_documento: termoSelecionado?.titulo, status_assinatura: true, url_documento_assinado: { texto_acordado: termoSelecionado?.conteudo, respostas_extras: respostasTermo, autorizacao: autorizacaoTermo, cidade: cidadeTermo, data_assinatura: dataAssinatura, assinatura_cliente_desenho: imgCliente, assinatura_profissional_desenho: imgProf, assinatura_eletronica: dadosAssinatura } }; if (termoPreenchidoId) { const { data } = await supabase.from('documentos_legais').update(payload).eq('id', termoPreenchidoId).select().single(); if (data) { setHistoricoDocumentos(prev => prev.map(d => d.id === termoPreenchidoId ? data : d)); setFluxoDocumento('lista'); } } else { const { data } = await supabase.from('documentos_legais').insert([payload]).select().single(); if (data) { setHistoricoDocumentos(prev => [data, ...prev]); setFluxoDocumento('lista'); } } };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files.length > 0) setArquivoMidia(e.target.files[0]); };
  const salvarNovaMidia = async () => { if (!arquivoMidia) return alert('Selecione uma foto.'); if (!formMidia.procedimento) return alert('Informe o procedimento.'); setUploadingMidia(true); try { const fileExt = arquivoMidia.name.split('.').pop(); const fileName = `${form.id}-${Date.now()}.${fileExt}`; const { error: uploadError } = await supabase.storage.from('midias').upload(fileName, arquivoMidia, { cacheControl: '3600', upsert: false }); if (uploadError) throw new Error(uploadError.message); const { data: publicUrlData } = supabase.storage.from('midias').getPublicUrl(fileName); const payload = { paciente_id: form.id, url_arquivo: publicUrlData.publicUrl, categoria: formMidia.categoria, procedimento: formMidia.procedimento, data_registro: formMidia.data_registro, observacoes: formMidia.observacoes }; const { data, error: dbError } = await supabase.from('paciente_midias').insert([payload]).select().single(); if (dbError) throw new Error(dbError.message); alert('Foto salva!'); setHistoricoMidias(prev => [data as Midia, ...prev]); setFluxoMidia('lista'); setArquivoMidia(null); setFormMidia({ ...formMidia, procedimento: '', observacoes: '' }); } catch (error: any) { alert(error.message); } finally { setUploadingMidia(false); } };
  const deletarMidia = async (id: string, url_arquivo: string) => { if (window.confirm('Excluir foto?')) { await supabase.from('paciente_midias').delete().eq('id', id); try { const fileName = url_arquivo.split('/').pop(); if (fileName) await supabase.storage.from('midias').remove([fileName]); } catch (e) {} setHistoricoMidias(prev => prev.filter(m => m.id !== id)); } };

  const abrirPerfilPaciente = (paciente: Paciente) => { setForm(paciente); setIsEditing(true); setAbaAtiva('dados'); setFluxoAnamnese('lista'); setFluxoDocumento('lista'); setFluxoMidia('lista'); setHistoricoAnamneses([]); setHistoricoDocumentos([]); setHistoricoMidias([]); buscarHistoricoPaciente(paciente.id); buscarModelosDisponiveis(); setModalAberto(true); };
  const pacientesProcessados = pacientes.filter(p => p.nome_completo.toLowerCase().includes(busca.toLowerCase())).sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));

  return (
    <div className="w-full h-full flex flex-col mx-auto overflow-hidden sm:p-8 max-w-7xl">
      
      {/* CABEÇALHO DA PÁGINA (Com margens restauradas apenas no eixo Y e encostado às laterais) */}
      <header className="px-4 pt-6 pb-2 sm:p-0 flex flex-col sm:flex-row justify-between gap-3 w-full shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-gray-800">Pacientes</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">Gestão de prontuários 100% digitais</p>
        </div>
        <button 
          onClick={() => { setForm({}); setIsEditing(false); setAbaAtiva('dados'); setModalAberto(true); }} 
          className="bg-[#B68B40] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#9a7330] w-full sm:w-auto shadow-sm shrink-0"
        >
          + Novo Paciente
        </button>
      </header>

      {gerandoPdf && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-[#B68B40] border-t-transparent rounded-full animate-spin mb-6"></div>
          <h2 className="text-2xl font-serif text-[#B68B40]">Gerando Documento Oficial</h2>
          <p className="text-gray-500 mt-2 font-medium text-center px-4">Aguarde, formatando o PDF para download automático...</p>
        </div>
      )}

      {/* CAIXA BRANCA PRINCIPAL (Edge-to-Edge no telemóvel, com bordas apenas no computador) */}
      <div className="bg-white sm:rounded-lg border-y sm:border border-[#B68B40]/30 shadow-sm flex-1 flex flex-col overflow-hidden w-full">
        
        {/* BARRA DE PESQUISA */}
        <div className="p-3 md:p-4 border-b border-[#B68B40]/20 bg-[#FDFCFB] shrink-0">
          <input type="text" placeholder="Procurar paciente..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full md:max-w-md border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:border-[#B68B40]"/>
        </div>
        
        {/* ÁREA DA LISTA */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">
          
          {/* LAYOUT PARA TELEMÓVEL: Lista 100% Edge-to-Edge, ícones distribuídos para a direita */}
          <div className="block sm:hidden w-full overflow-x-hidden">
            {pacientesProcessados.map(paciente => (
              <div key={paciente.id} className="px-4 py-4 flex items-center justify-between border-b border-gray-100 hover:bg-[#B68B40]/5 cursor-pointer transition-colors" onClick={() => abrirPerfilPaciente(paciente)}>
                
                {/* Texto ganha flex-1 para ocupar o espaço necessário, mas sem forçar a tela */}
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm font-medium text-gray-800 truncate" title={paciente.nome_completo}>{paciente.nome_completo}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{paciente.telefone || 'Sem telefone'}</p>
                </div>
                
                {/* Ícones agrupados à direita */}
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={(e) => deletarPaciente(paciente.id, e)} className="text-red-400 p-2 hover:bg-red-50 rounded-full transition-colors" title="Eliminar Paciente">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
            ))}
          </div>

          {/* LAYOUT PARA COMPUTADOR: Tabela Clássica */}
          <table className="hidden sm:table w-full text-left table-fixed">
            <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase sticky top-0 border-b border-gray-200">
              <tr>
                <th className="p-4 w-[50%]">Paciente</th>
                <th className="p-4 w-[30%]">Contato</th>
                <th className="p-4 text-right w-[20%]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pacientesProcessados.map(paciente => (
                <tr key={paciente.id} className="hover:bg-[#B68B40]/5 cursor-pointer transition-colors" onClick={() => abrirPerfilPaciente(paciente)}>
                  <td className="p-4 font-medium text-gray-800 truncate">{paciente.nome_completo}</td>
                  <td className="p-4 text-sm text-gray-600 truncate">{paciente.telefone || '---'}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-4">
                      <button onClick={(e) => deletarPaciente(paciente.id, e)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors shrink-0" title="Eliminar Paciente">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      </div>

      {/* MODAL / PERFIL DO PACIENTE (Edge-to-Edge no mobile) */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 sm:p-4">
          <div className="bg-white sm:rounded-xl shadow-2xl w-full max-w-5xl h-full sm:h-[90vh] flex flex-col overflow-hidden mx-auto">
            <div className="p-4 md:p-5 border-b border-gray-100 flex justify-between items-center bg-[#FDFCFB] shrink-0">
              <h2 className="text-lg md:text-xl font-medium text-[#B68B40] truncate pr-4">{isEditing ? `Prontuário: ${form.nome_completo}` : 'Novo Paciente'}</h2>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 text-2xl shrink-0 hover:text-gray-600">&times;</button>
            </div>

            {isEditing && (
              <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto whitespace-nowrap shrink-0">
                <button onClick={() => setAbaAtiva('dados')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${abaAtiva === 'dados' ? 'border-[#B68B40] text-[#B68B40]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Dados Pessoais</button>
                <button onClick={() => { setAbaAtiva('anamneses'); setFluxoAnamnese('lista'); }} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${abaAtiva === 'anamneses' ? 'border-[#B68B40] text-[#B68B40]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Fichas de Anamnese</button>
                <button onClick={() => { setAbaAtiva('documentos'); setFluxoDocumento('lista'); }} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${abaAtiva === 'documentos' ? 'border-[#B68B40] text-[#B68B40]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Documentos & Termos</button>
                <button onClick={() => { setAbaAtiva('midias'); setFluxoMidia('lista'); }} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${abaAtiva === 'midias' ? 'border-[#B68B40] text-[#B68B40]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Mídias & Evolução</button>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
              
              {/* --- ABA DADOS --- */}
              {abaAtiva === 'dados' && (
                <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
                  <div><label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Nome Completo *</label><input type="text" value={form.nome_completo || ''} onChange={e => setForm({...form, nome_completo: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none" required /></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div><label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">CPF</label><input type="text" value={form.cpf || ''} onChange={e => setForm({...form, cpf: formatarCPF(e.target.value)})} maxLength={14} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none" /></div>
                    <div><label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">RG</label><input type="text" value={form.rg || ''} onChange={e => setForm({...form, rg: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none" /></div>
                    <div><label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Data de Nascimento</label><input type="date" value={form.data_nascimento || ''} onChange={e => setForm({...form, data_nascimento: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none text-gray-700" /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Telefone (WhatsApp)</label><input type="text" value={form.telefone || ''} onChange={e => setForm({...form, telefone: formatarTelefone(e.target.value)})} maxLength={15} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none" /></div>
                    <div><label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">E-mail</label><input type="email" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none" /></div>
                  </div>
                  <div><label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Endereço Completo</label><input type="text" value={form.endereco || ''} onChange={e => setForm({...form, endereco: e.target.value})} placeholder="Rua, Número, Bairro, Cidade - Estado" className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none" /></div>
                  <div className="flex justify-end pt-4"><button onClick={salvarPaciente} className="bg-[#B68B40] text-white px-8 py-3 rounded-lg text-sm font-medium hover:bg-[#9a7330] shadow-sm w-full md:w-auto">Guardar Dados</button></div>
                </div>
              )}

              {/* --- ABA ANAMNESES --- */}
              {abaAtiva === 'anamneses' && (
                <div className="p-4 md:p-6 h-full flex flex-col">
                  {fluxoAnamnese === 'lista' && (
                    <>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6"><h3 className="text-lg font-medium text-gray-800">Histórico de Fichas</h3><button onClick={() => setFluxoAnamnese('selecao')} className="bg-[#B68B40] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#9a7330]">+ Nova Ficha Digital</button></div>
                      <div className="space-y-3">
                        {historicoAnamneses.length === 0 ? ( <p className="text-gray-400 text-sm text-center py-12 border-2 border-dashed rounded-xl bg-gray-50">Nenhuma ficha salva para este paciente.</p> ) : (
                          historicoAnamneses.map((f, index) => (
                            <div key={f.id || index} className="p-4 border border-gray-200 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-gray-50/80 hover:bg-white transition-colors">
                              <div><p className="font-medium text-[#B68B40] text-base">{f.historico_medico?.tipo_ficha || 'Ficha de Anamnese'}</p><p className="text-xs text-gray-500 mt-1">Data: {f.historico_medico?.data_assinatura ? new Date(f.historico_medico.data_assinatura).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : new Date(f.created_at).toLocaleDateString('pt-BR')}</p></div>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 hidden md:inline-block">Autenticado</span>
                                <button onClick={() => baixarPDF('ficha', f)} className="text-[#B68B40] text-sm font-medium hover:underline px-2 sm:border-l border-gray-300">Baixar PDF</button>
                                <button onClick={() => editarFichaSalva(f)} className="text-[#B68B40] text-sm font-medium hover:underline px-2 border-l border-gray-300">Ver / Editar</button>
                                <button onClick={() => excluirFichaSalva(f.id)} className="text-red-500 text-sm font-medium hover:underline px-2 border-l border-gray-300">Excluir</button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                  {fluxoAnamnese === 'selecao' && (
                    <div>
                      <button onClick={() => setFluxoAnamnese('lista')} className="text-[#B68B40] text-sm hover:underline mb-6 block">← Voltar</button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {modelosFichas.map(modelo => (
                          <div key={modelo.id} onClick={() => iniciarNovaFicha(modelo)} className="p-5 border border-gray-200 rounded-xl hover:border-[#B68B40] cursor-pointer text-center bg-white"><div className="w-12 h-12 bg-[#B68B40]/10 text-[#B68B40] rounded-full flex items-center justify-center mx-auto mb-3 text-xl">📋</div><h4 className="font-medium text-gray-800">{modelo.titulo}</h4></div>
                        ))}
                      </div>
                    </div>
                  )}
                  {fluxoAnamnese === 'preenchendo' && fichaSelecionada && (
                    <div className="max-w-3xl mx-auto w-full pb-10">
                      <button onClick={() => setFluxoAnamnese('lista')} className="text-[#B68B40] text-sm hover:underline mb-6 block">← Voltar</button>
                      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-8 shadow-sm overflow-x-hidden">
                        <h2 className="text-xl md:text-2xl font-light text-[#B68B40] text-center mb-2">{fichaSelecionada.titulo}</h2>
                        <p className="text-center text-xs text-gray-400 mb-8">Paciente: {form.nome_completo}</p>
                        <div className="space-y-8">
                          {fichaSelecionada.campos?.map((secao, idx) => (
                            <div key={idx} className="border-b border-gray-100 pb-6">
                              <h3 className="text-sm font-bold text-[#B68B40] uppercase tracking-wider mb-4 bg-[#B68B40]/5 p-2 rounded">{secao.titulo}</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {secao.campos?.map((campo) => (
                                  <div key={campo.id} className={campo.tipo === 'textarea' ? 'col-span-1 md:col-span-2' : ''}>
                                    <label className="block text-sm text-gray-700 mb-1.5 font-medium">{campo.label}</label>
                                    {campo.tipo === 'text' && (<input type="text" value={respostasAtuais[campo.id] || ''} onChange={e => setRespostasAtuais({...respostasAtuais, [campo.id]: e.target.value})} className="w-full border border-gray-300 p-2.5 text-sm rounded-lg outline-none focus:border-[#B68B40]" />)}
                                    {campo.tipo === 'textarea' && (<textarea value={respostasAtuais[campo.id] || ''} onChange={e => setRespostasAtuais({...respostasAtuais, [campo.id]: e.target.value})} className="w-full border border-gray-300 p-2.5 text-sm rounded-lg outline-none focus:border-[#B68B40] h-24" />)}
                                    {campo.tipo === 'select' && campo.opcoes?.length === 2 && campo.opcoes.includes('Não') && campo.opcoes.includes('Sim') ? (
                                      <div className="flex items-center gap-6 mt-2"><label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700"><input type="radio" name={campo.id} value="Sim" checked={respostasAtuais[campo.id] === 'Sim'} onChange={(e) => setRespostasAtuais({...respostasAtuais, [campo.id]: e.target.value})} className="accent-[#B68B40] w-4 h-4" /> SIM</label><label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700"><input type="radio" name={campo.id} value="Não" checked={respostasAtuais[campo.id] === 'Não'} onChange={(e) => setRespostasAtuais({...respostasAtuais, [campo.id]: e.target.value})} className="accent-[#B68B40] w-4 h-4" /> NÃO</label></div>
                                    ) : campo.tipo === 'select' ? (
                                      <select value={respostasAtuais[campo.id] || ''} onChange={e => setRespostasAtuais({...respostasAtuais, [campo.id]: e.target.value})} className="w-full border border-gray-300 p-2.5 text-sm rounded-lg outline-none focus:border-[#B68B40] bg-white"><option value="">Selecione...</option>{campo.opcoes?.map((op) => <option key={op} value={op}>{op}</option>)}</select>
                                    ) : null}
                                    {campo.tipo === 'checkbox' && (<div className="flex items-center gap-2 mt-2"><input type="checkbox" checked={!!respostasAtuais[campo.id]} onChange={e => setRespostasAtuais({...respostasAtuais, [campo.id]: e.target.checked})} className="accent-[#B68B40] w-4 h-4 cursor-pointer" /><span className="text-sm text-gray-700">Sim / Confirmado</span></div>)}
                                    {campo.tipo === 'multiselect' && (
                                      <div className="grid grid-cols-2 gap-2 mt-2">{campo.opcoes?.map((op) => { const checked = (respostasAtuais[campo.id] || []).includes(op); return (<label key={op} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={checked} className="accent-[#B68B40]" onChange={(e) => { const anteriores = respostasAtuais[campo.id] || []; const novos = e.target.checked ? [...anteriores, op] : anteriores.filter((item: string) => item !== op); setRespostasAtuais({...respostasAtuais, [campo.id]: novos}); }}/> {op}</label>); })}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-8 border-t border-gray-200 pt-8">
                          <h3 className="text-lg font-medium text-[#B68B40] mb-4 uppercase">Declaração</h3>
                          <div className="bg-gray-50 p-4 md:p-6 rounded-lg border border-gray-100 mb-6 text-sm">{formatarTextoTermo(obterTextoDeclaracao(fichaSelecionada.titulo))}</div>
                          <div className="flex flex-col sm:flex-row gap-4 mb-8">
                            <div className="flex-1"><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cidade</label><input type="text" value={cidadeTermo} onChange={e => setCidadeTermo(e.target.value)} className="w-full border-b border-gray-300 p-2 text-sm outline-none focus:border-[#B68B40]" /></div>
                            <div className="sm:w-1/3"><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Data</label><input type="date" value={dataAssinatura} onChange={e => setDataAssinatura(e.target.value)} className="w-full border-b border-gray-300 p-2 text-sm outline-none focus:border-[#B68B40]" /></div>
                          </div>

                          <div className="border border-gray-200 rounded-xl p-4 md:p-5 bg-gray-50/50 mb-6">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-700 mb-2">Assinatura do(a) Paciente</h3>
                            <div className="border-2 border-dashed border-gray-300 bg-white rounded-lg overflow-hidden touch-none h-32 w-full"><canvas ref={canvasRef} width={800} height={128} className="w-full h-full cursor-crosshair" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} /></div>
                            <button onClick={limparAssinatura} className="text-xs text-gray-500 hover:text-red-500 underline mt-2 block ml-auto">Limpar</button>
                          </div>

                          <div className="border border-emerald-500/30 rounded-xl p-4 md:p-6 bg-emerald-50/20 shadow-sm">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-800 mb-4 flex items-center gap-2">🔒 Assinatura Eletrônica</h3>
                            <div className="space-y-5">
                              <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={termoAceito} onChange={e => setTermoAceito(e.target.checked)} className="mt-1 accent-emerald-600 w-5 h-5 cursor-pointer shrink-0" /><span className="text-sm text-gray-700 leading-relaxed">Declaro que li e concordo integralmente com as informações. Reconheço a validade desta assinatura eletrônica.</span></label>
                              <div><label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Confirme o CPF do Paciente *</label><input type="text" value={cpfAssinatura} onChange={e => setCpfAssinatura(formatarCPF(e.target.value))} maxLength={14} placeholder="000.000.000-00" className="w-full max-w-sm border border-gray-300 rounded-lg p-3 text-sm focus:border-emerald-500 outline-none bg-white shadow-inner" /></div>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end mt-8"><button onClick={salvarFichaAnamnese} className="bg-[#B68B40] text-white px-8 py-3 rounded-lg font-bold text-sm hover:bg-[#9a7330] shadow-sm w-full md:w-auto">{fichaPreenchidaId ? 'Atualizar e Re-assinar Ficha' : 'Assinar Digitalmente e Salvar'}</button></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* --- ABA DOCUMENTOS E TERMOS --- */}
              {abaAtiva === 'documentos' && (
                <div className="p-4 md:p-6 h-full flex flex-col">
                  {fluxoDocumento === 'lista' && (
                    <>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6"><h3 className="text-lg font-medium text-gray-800">Termos de Consentimento</h3><button onClick={() => setFluxoDocumento('selecao')} className="bg-[#B68B40] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#9a7330]">+ Novo Termo</button></div>
                      <div className="space-y-3">
                        {historicoDocumentos.length === 0 ? ( <p className="text-gray-400 text-sm text-center py-12 border-2 border-dashed rounded-xl bg-gray-50">Nenhum termo assinado.</p> ) : (
                          historicoDocumentos.map((d) => (
                            <div key={d.id} className="p-4 border border-gray-200 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-gray-50/80 hover:bg-white">
                              <div><p className="font-medium text-[#B68B40] text-base">{d.tipo_documento}</p><p className="text-xs text-gray-500 mt-1">Data: {new Date(d.url_documento_assinado.data_assinatura || d.created_at).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p></div>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 hidden md:inline-block">Autenticado</span>
                                <button onClick={() => baixarPDF('termo', d)} className="text-[#B68B40] text-sm font-medium hover:underline px-2 sm:border-l border-gray-300">Baixar PDF</button>
                                <button onClick={() => editarTermoSalvo(d)} className="text-[#B68B40] text-sm font-medium hover:underline px-2 border-l border-gray-300">Ver / Editar</button>
                                <button onClick={() => excluirTermoSalvo(d.id)} className="text-red-500 text-sm font-medium hover:underline px-2 border-l border-gray-300">Excluir</button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                  {fluxoDocumento === 'selecao' && (
                    <div>
                      <button onClick={() => setFluxoDocumento('lista')} className="text-[#B68B40] text-sm hover:underline mb-6">← Voltar</button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {modelosTermos.map(termo => (
                          <div key={termo.id} onClick={() => iniciarNovoTermo(termo)} className="p-5 border border-gray-200 rounded-xl hover:border-[#B68B40] cursor-pointer text-center group"><div className="text-2xl mb-2">🖋️</div><h4 className="font-medium text-gray-800 group-hover:text-[#B68B40]">{termo.titulo}</h4></div>
                        ))}
                      </div>
                    </div>
                  )}
                  {fluxoDocumento === 'preenchendo' && termoSelecionado && (
                    <div className="max-w-3xl mx-auto w-full pb-10">
                      <button onClick={() => setFluxoDocumento('lista')} className="text-[#B68B40] text-sm hover:underline mb-6">← Voltar</button>
                      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-8 shadow-sm overflow-x-hidden">
                        <h2 className="text-xl md:text-2xl font-serif text-center text-[#B68B40] mb-8 uppercase border-b border-gray-100 pb-4">{termoSelecionado.titulo}</h2>
                        <div className="mb-8 bg-gray-50 p-4 md:p-6 rounded-lg border border-gray-100 text-sm">{formatarTextoTermo(termoSelecionado.conteudo)}</div>
                        
                        {termoSelecionado.campos && termoSelecionado.campos.length > 0 && (
                          <div className="bg-gray-50 p-4 md:p-6 rounded-lg border border-gray-200 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {termoSelecionado.campos.map(campo => (
                              <div key={campo.id} className={campo.tipo === 'textarea' ? 'col-span-1 md:col-span-2' : ''}>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">{campo.label}</label>
                                {campo.tipo === 'textarea' ? (<textarea value={respostasTermo[campo.id] || ''} onChange={e => setRespostasTermo({...respostasTermo, [campo.id]: e.target.value})} className="w-full border border-gray-300 p-2.5 text-sm rounded outline-none focus:border-[#B68B40] h-16"/>) : (<input type={campo.tipo} value={respostasTermo[campo.id] || ''} onChange={e => setRespostasTermo({...respostasTermo, [campo.id]: e.target.value})} className="w-full border border-gray-300 p-2.5 text-sm rounded outline-none focus:border-[#B68B40]"/>)}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="border border-gray-200 rounded-lg p-4 md:p-5 mb-8">
                          <p className="text-gray-800 font-medium mb-4 text-sm md:text-base">Estou ciente de que os resultados podem variar de acordo com cada organismo e que a realização do procedimento não representa garantia de resultado específico.</p>
                          <div className="flex flex-col gap-3">
                            <label className="flex items-center gap-3 cursor-pointer text-sm font-bold text-gray-700"><input type="radio" name="autorizacao" value="Sim" checked={autorizacaoTermo === 'Sim'} onChange={() => setAutorizacaoTermo('Sim')} className="w-5 h-5 accent-[#B68B40] shrink-0"/> AUTORIZO a realização do procedimento / uso de imagem</label>
                            <label className="flex items-center gap-3 cursor-pointer text-sm font-bold text-gray-700"><input type="radio" name="autorizacao" value="Não" checked={autorizacaoTermo === 'Não'} onChange={() => setAutorizacaoTermo('Não')} className="w-5 h-5 accent-red-500 shrink-0"/> NÃO AUTORIZO a realização do procedimento / uso de imagem</label>
                          </div>
                        </div>

                        <div className="mt-8 border-t border-gray-200 pt-8">
                          <div className="flex flex-col sm:flex-row gap-4 mb-8">
                            <div className="flex-1"><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cidade</label><input type="text" value={cidadeTermo} onChange={e => setCidadeTermo(e.target.value)} className="w-full border-b border-gray-300 p-2 text-sm outline-none focus:border-[#B68B40]" /></div>
                            <div className="sm:w-1/3"><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Data</label><input type="date" value={dataAssinatura} onChange={e => setDataAssinatura(e.target.value)} className="w-full border-b border-gray-300 p-2 text-sm outline-none focus:border-[#B68B40]" /></div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50"><h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-2">Assinatura do(a) Paciente</h3><div className="border-2 border-dashed border-gray-300 bg-white rounded-lg overflow-hidden touch-none h-32 w-full"><canvas ref={canvasClienteRef} width={400} height={128} className="w-full h-full cursor-crosshair" onMouseDown={(e) => startDrawingTermo(e, 'cliente')} onMouseMove={(e) => drawTermo(e, 'cliente')} onMouseUp={() => stopDrawingTermo('cliente')} onMouseOut={() => stopDrawingTermo('cliente')} onTouchStart={(e) => startDrawingTermo(e, 'cliente')} onTouchMove={(e) => drawTermo(e, 'cliente')} onTouchEnd={() => stopDrawingTermo('cliente')} /></div><button onClick={() => limparCanvasTermo('cliente')} className="text-xs text-gray-500 hover:text-red-500 underline mt-2 block ml-auto">Limpar</button></div>
                            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50"><h3 className="text-sm font-bold uppercase tracking-wider text-[#B68B40] mb-2">Assinatura da Profissional</h3><div className="border-2 border-dashed border-[#B68B40]/50 bg-white rounded-lg overflow-hidden touch-none h-32 w-full"><canvas ref={canvasProfRef} width={400} height={128} className="w-full h-full cursor-crosshair" onMouseDown={(e) => startDrawingTermo(e, 'prof')} onMouseMove={(e) => drawTermo(e, 'prof')} onMouseUp={() => stopDrawingTermo('prof')} onMouseOut={() => stopDrawingTermo('prof')} onTouchStart={(e) => startDrawingTermo(e, 'prof')} onTouchMove={(e) => drawTermo(e, 'prof')} onTouchEnd={() => stopDrawingTermo('prof')} /></div><button onClick={() => limparCanvasTermo('prof')} className="text-xs text-gray-500 hover:text-red-500 underline mt-2 block ml-auto">Limpar</button></div>
                          </div>

                          <div className="border border-emerald-500/30 rounded-xl p-4 md:p-6 bg-emerald-50/20 shadow-sm">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-800 mb-4 flex items-center gap-2">🔒 Assinatura Eletrônica Dupla</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4"><label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={termoAceito} onChange={e => setTermoAceito(e.target.checked)} className="mt-1 accent-emerald-600 w-5 h-5 cursor-pointer shrink-0" /><span className="text-sm text-gray-700 leading-relaxed">Eu, Paciente, concordo com os termos.</span></label><div><label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">CPF do Paciente *</label><input type="text" value={cpfAssinatura} onChange={e => setCpfAssinatura(formatarCPF(e.target.value))} maxLength={14} placeholder="000.000.000-00" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-emerald-500 outline-none bg-white shadow-inner" /></div></div>
                              <div className="space-y-4"><label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={profAceito} onChange={e => setProfAceito(e.target.checked)} className="mt-1 accent-emerald-600 w-5 h-5 cursor-pointer shrink-0" /><span className="text-sm text-gray-700 leading-relaxed">Eu, Profissional, atesto a conformidade.</span></label><div><label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Registro/CPF Profissional *</label><input type="text" value={registroProfissional} onChange={e => setRegistroProfissional(e.target.value)} placeholder="CRBM ou CPF" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-emerald-500 outline-none bg-white shadow-inner" /></div></div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end mt-10"><button onClick={salvarDocumentoTermo} className="bg-[#B68B40] text-white px-8 py-3 rounded-lg font-bold text-sm hover:bg-[#9a7330] shadow-sm w-full md:w-auto">{termoPreenchidoId ? 'Atualizar Termo' : 'Assinar Termo Oficialmente'}</button></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* --- ABA MÍDIAS E EVOLUÇÃO --- */}
              {abaAtiva === 'midias' && (
                <div className="p-4 md:p-6 h-full flex flex-col">
                  {fluxoMidia === 'lista' && (
                    <>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6"><h3 className="text-lg font-medium text-gray-800">Galeria de Mídias</h3><button onClick={() => setFluxoMidia('upload')} className="bg-[#B68B40] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#9a7330]">+ Adicionar Foto</button></div>
                      {historicoMidias.length === 0 ? ( <p className="text-gray-400 text-sm text-center py-12 border-2 border-dashed rounded-xl bg-gray-50">O paciente ainda não possui fotos.</p> ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 overflow-y-auto">
                          {historicoMidias.map(midia => (
                            <div key={midia.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group relative">
                              <div className={`absolute top-2 left-2 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm z-10 ${ midia.categoria === 'Antes' ? 'bg-gray-600' : midia.categoria === 'Depois' ? 'bg-[#B68B40]' : 'bg-emerald-600'}`}>{midia.categoria}</div>
                              <div className="h-40 w-full bg-gray-100 relative"><img src={midia.url_arquivo} alt="Evolução" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><button onClick={() => window.open(midia.url_arquivo, '_blank')} className="text-white text-xs font-medium border border-white px-3 py-1.5 rounded hover:bg-white hover:text-black transition-colors">Ampliar Foto</button></div></div>
                              <div className="p-3"><p className="text-sm font-bold text-gray-800 truncate">{midia.procedimento}</p><p className="text-[11px] text-gray-500 mt-1 truncate">{midia.observacoes || 'Sem observações extras'}</p><div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100"><span className="text-[10px] text-gray-400 font-medium">Data: {new Date(midia.data_registro).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span><button onClick={() => deletarMidia(midia.id, midia.url_arquivo)} className="text-red-400 hover:text-red-600 text-xs">Excluir</button></div></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {fluxoMidia === 'upload' && (
                    <div className="max-w-xl mx-auto w-full pb-10">
                      <button onClick={() => setFluxoMidia('lista')} className="text-[#B68B40] text-sm hover:underline mb-6 block">← Voltar para a galeria</button>
                      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm space-y-5">
                        <h2 className="text-xl font-light text-[#B68B40] text-center mb-4">Adicionar Nova Foto</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Etapa (Evolução) *</label><select value={formMidia.categoria} onChange={e => setFormMidia({...formMidia, categoria: e.target.value as any})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-[#B68B40] outline-none bg-white"><option value="Antes">Antes do Procedimento</option><option value="Durante">Durante o Tratamento</option><option value="Depois">Depois (Resultado Final)</option></select></div>
                          <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Data da Foto *</label><input type="date" value={formMidia.data_registro} onChange={e => setFormMidia({...formMidia, data_registro: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-[#B68B40] outline-none" /></div>
                        </div>
                        <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Procedimento *</label><input type="text" value={formMidia.procedimento} onChange={e => setFormMidia({...formMidia, procedimento: e.target.value})} placeholder="Ex: Lipo Enzimática de Papada" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-[#B68B40] outline-none" /></div>
                        <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Arquivo da Imagem *</label><input type="file" accept="image/*" onChange={handleFileChange} className="w-full border border-dashed border-gray-300 rounded-lg p-3 text-sm focus:border-[#B68B40] outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#B68B40]/10 file:text-[#B68B40] hover:file:bg-[#B68B40]/20 cursor-pointer" /></div>
                        <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Observações Técnicas</label><textarea value={formMidia.observacoes} onChange={e => setFormMidia({...formMidia, observacoes: e.target.value})} placeholder="Ex: Paciente apresentou leve edema..." className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-[#B68B40] outline-none h-20" /></div>
                        <div className="flex justify-end pt-4"><button onClick={salvarNovaMidia} disabled={uploadingMidia} className="bg-[#B68B40] text-white px-8 py-3 rounded-lg font-bold text-sm hover:bg-[#9a7330] shadow-sm disabled:opacity-50 w-full sm:w-auto">{uploadingMidia ? 'Enviando...' : 'Salvar Foto na Galeria'}</button></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}