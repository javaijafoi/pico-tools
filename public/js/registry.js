// Catálogo das ferramentas. Sem dependência de DOM (o build.mjs também lê este arquivo).
export const SITE = 'https://pico-tools-javaijafoi.vercel.app';
export const CATS = {
  img: { name: 'IMAGEM', color: '#ff77a8' },
  vid: { name: 'VÍDEO', color: '#83769c' },
  aud: { name: 'ÁUDIO', color: '#00b543' },
  pdf: { name: 'PDF', color: '#ff004d' },
  text: { name: 'TEXTO', color: '#29adff' },
  gen: { name: 'GERADORES', color: '#00e436' },
  calc: { name: 'CALCULADORAS', color: '#ffec27' },
  dev: { name: 'DEV', color: '#ffa300' },
};

// [slug, grupo(arquivo), categoria, ícone, nome, descrição curta, palavras-chave, texto SEO]
const T = [
  ['contador-de-palavras', 'text', 'text', '🔢', 'Contador de palavras', 'Palavras, caracteres, frases e tempo de leitura.', 'contar palavras caracteres letras frases parágrafos tempo de leitura', 'Cole ou digite o texto e veja na hora quantas palavras, caracteres (com e sem espaços), frases, parágrafos e linhas ele tem, além do tempo estimado de leitura.'],
  ['inverter-texto', 'text', 'text', '🔁', 'Inverter texto', 'Inverte o texto de trás para frente, por palavra ou por linha.', 'inverter texto reverter espelhar de trás para frente', 'Inverta um texto de trás para frente, inverta a ordem das palavras ou das linhas, ou espelhe cada palavra, tudo no próprio aparelho.'],
  ['maiusculas-minusculas', 'text', 'text', '🔠', 'Maiúsculas e minúsculas', 'MAIÚSCULAS, minúsculas, Título, camelCase, snake_case e mais.', 'maiúsculas minúsculas converter caixa alta baixa título camelcase snake kebab', 'Converta texto para MAIÚSCULAS, minúsculas, Título, frase, camelCase, snake_case, kebab-case e alternado.'],
  ['remover-acentos', 'text', 'text', '🧹', 'Remover acentos e gerar slug', 'Tira acentos e cedilha e cria slugs para URL.', 'remover acentos slug url cedilha normalizar texto', 'Remova acentos, cedilha e caracteres especiais de qualquer texto ou gere um slug limpo para usar em endereços de site.'],
  ['remover-linhas-duplicadas', 'text', 'text', '📑', 'Remover linhas duplicadas e ordenar', 'Limpa duplicadas, ordena e embaralha linhas de uma lista.', 'remover linhas duplicadas ordenar lista alfabética embaralhar', 'Cole uma lista, remova as linhas repetidas, ordene em ordem alfabética ou numérica, inverta ou embaralhe.'],
  ['comparar-textos', 'text', 'text', '🆚', 'Comparar textos', 'Mostra o que mudou entre dois textos, linha a linha.', 'comparar textos diff diferença versões', 'Cole duas versões de um texto e veja as linhas adicionadas e removidas, em destaque.'],
  ['lorem-ipsum', 'text', 'text', '📜', 'Gerador de Lorem Ipsum', 'Texto de preenchimento em parágrafos, frases ou palavras.', 'lorem ipsum gerador texto de exemplo placeholder', 'Gere texto Lorem Ipsum na quantidade de parágrafos, frases ou palavras que precisar para seus layouts.'],
  ['numero-por-extenso', 'text', 'text', '💬', 'Número por extenso', 'Escreve números e valores em reais por extenso.', 'número por extenso valor por extenso reais cheque recibo', 'Escreva qualquer número ou valor em reais por extenso, útil para recibos, contratos e cheques.'],

  ['gerador-de-cpf', 'gen', 'gen', '🪪', 'Gerador de CPF', 'Gera CPFs válidos para testes, com ou sem pontuação.', 'gerador de cpf cpf válido para teste gerar cpf', 'Gere CPFs com dígitos verificadores válidos para testar sistemas e formulários. Os números são fictícios e gerados no seu aparelho.'],
  ['gerador-de-cnpj', 'gen', 'gen', '🏢', 'Gerador de CNPJ', 'Gera CNPJs válidos, inclusive no novo formato alfanumérico.', 'gerador de cnpj cnpj válido para teste cnpj alfanumérico', 'Gere CNPJs válidos para testes, no formato numérico tradicional ou no novo formato alfanumérico adotado em 2026.'],
  ['validador-cpf-cnpj', 'gen', 'gen', '✅', 'Validador de CPF e CNPJ', 'Confere se um CPF ou CNPJ tem os dígitos corretos.', 'validar cpf validar cnpj validador dígito verificador', 'Confira se um CPF ou CNPJ é válido calculando os dígitos verificadores, sem consultar nenhum serviço externo.'],
  ['gerador-de-senha', 'gen', 'gen', '🔑', 'Gerador de senha', 'Senhas fortes e aleatórias com o tamanho que você quiser.', 'gerador de senha senha forte aleatória segura', 'Crie senhas fortes e aleatórias usando o gerador criptográfico do navegador. Nada sai do seu aparelho.'],
  ['gerador-de-uuid', 'gen', 'gen', '🧬', 'Gerador de UUID', 'UUID v4 em lote, com ou sem hífens.', 'gerador de uuid guid v4 identificador único', 'Gere UUIDs versão 4 em lote, em maiúsculas ou minúsculas, com ou sem hífens.'],
  ['sorteador', 'gen', 'gen', '🎲', 'Sorteador', 'Sorteia nomes, números, times, cara ou coroa e dados.', 'sorteador sorteio de nomes número aleatório dividir times dado cara ou coroa', 'Sorteie nomes de uma lista, números num intervalo, divida pessoas em times, jogue dados ou cara e coroa.'],
  ['gerador-de-qr-code', 'gen', 'gen', '▦', 'Gerador de QR Code', 'Cria QR Code de texto, link ou Wi-Fi e baixa em PNG.', 'gerador de qr code qrcode link wifi png', 'Crie QR Codes para links, textos ou redes Wi-Fi e baixe como imagem PNG ou SVG, sem cadastro.'],
  ['gerador-de-dados-fake', 'gen', 'gen', '🎭', 'Gerador de dados fictícios', 'Pessoas fictícias com nome, CPF, e-mail, telefone e CEP.', 'dados fictícios gerador de pessoas fake nome email telefone cep para teste', 'Gere pessoas fictícias com nome, CPF, e-mail, telefone e endereço para popular bancos e testar sistemas.'],

  ['remover-fundo', 'img', 'img', '✨', 'Remover fundo da imagem', 'Tira o fundo de fotos com IA, direto no seu aparelho.', 'remover fundo imagem tirar fundo foto png transparente bg remover recortar pessoa produto', 'Remova o fundo de qualquer foto com inteligência artificial que roda no seu navegador e baixe em PNG transparente, ou troque por uma cor. A foto não é enviada para nenhum servidor.'],
  ['converter-imagem', 'img', 'img', '🖼️', 'Converter imagem', 'PNG, JPG e WebP: converta entre formatos.', 'converter imagem png jpg jpeg webp', 'Converta imagens entre PNG, JPG e WebP direto no navegador, sem enviar a foto para lugar nenhum.'],
  ['comprimir-imagem', 'img', 'img', '🗜️', 'Comprimir imagem', 'Reduz o peso da foto escolhendo a qualidade.', 'comprimir imagem reduzir tamanho foto jpg png', 'Reduza o tamanho de fotos escolhendo a qualidade e vendo o resultado antes de baixar. Funciona offline.'],
  ['redimensionar-imagem', 'img', 'img', '📐', 'Redimensionar imagem', 'Muda largura e altura em pixels ou por porcentagem.', 'redimensionar imagem mudar tamanho pixels largura altura', 'Mude o tamanho de uma imagem em pixels ou porcentagem, mantendo a proporção.'],
  ['remover-metadados-imagem', 'img', 'img', '🕵️', 'Remover dados da foto (EXIF)', 'Apaga localização GPS e dados da câmera antes de compartilhar.', 'remover exif metadados foto localização gps privacidade', 'Apague a localização, o modelo do celular e outros metadados escondidos de uma foto antes de compartilhar.'],

  ['comprimir-video', 'media', 'vid', '🎞️', 'Comprimir vídeo', 'Diminui o peso do vídeo sem enviar para lugar nenhum.', 'comprimir vídeo reduzir tamanho vídeo diminuir mp4 whatsapp', 'Reduza o tamanho de vídeos escolhendo qualidade e resolução. Todo o processamento acontece no seu aparelho, sem upload.'],
  ['cortar-video', 'media', 'vid', '✂️', 'Cortar vídeo', 'Corta um trecho do vídeo pelo início e pelo fim.', 'cortar vídeo fatiar vídeo trim recortar trecho mp4', 'Corte um trecho de um vídeo informando o início e o fim, no modo rápido (sem recodificar) ou no modo preciso. Sem upload.'],
  ['video-para-gif', 'media', 'vid', '🎬', 'Vídeo para GIF', 'Transforma um trecho de vídeo em GIF animado.', 'vídeo para gif converter vídeo em gif criar gif', 'Transforme um trecho do vídeo em um GIF animado, escolhendo largura e fluidez, tudo no seu aparelho.'],
  ['extrair-audio', 'media', 'vid', '🎧', 'Extrair áudio do vídeo', 'Tira o áudio de um vídeo em MP3, WAV ou M4A.', 'extrair áudio do vídeo vídeo para mp3 converter vídeo em áudio', 'Extraia a trilha de áudio de qualquer vídeo e salve em MP3, WAV ou M4A, sem enviar o arquivo para servidor nenhum.'],
  ['cortar-audio', 'media', 'aud', '🎵', 'Cortar áudio', 'Corta um trecho de áudio e salva em MP3, WAV ou M4A.', 'cortar áudio fatiar áudio trim mp3 recortar música toque', 'Corte um trecho de um áudio (música, gravação, podcast) informando o início e o fim e baixe em MP3, WAV ou M4A.'],

  ['juntar-pdf', 'pdf', 'pdf', '🧲', 'Juntar PDF', 'Une vários PDFs em um só, na ordem que você quiser.', 'juntar pdf unir pdf mesclar merge', 'Una vários arquivos PDF em um único documento. Tudo acontece no seu aparelho, sem upload.'],
  ['dividir-pdf', 'pdf', 'pdf', '✂️', 'Dividir PDF', 'Divide por intervalo, por páginas ou em partes iguais.', 'dividir pdf separar páginas split cortar pdf', 'Divida um PDF em partes: por intervalos de páginas, a cada N páginas ou uma página por arquivo, com download em ZIP.'],
  ['girar-pdf', 'pdf', 'pdf', '🔄', 'Girar PDF', 'Gira todas as páginas ou só as que escolher.', 'girar pdf rotacionar páginas pdf', 'Gire todas as páginas de um PDF, ou apenas páginas escolhidas, em 90, 180 ou 270 graus.'],
  ['comprimir-pdf', 'pdf', 'pdf', '🗜️', 'Comprimir PDF', 'Reduz o tamanho do PDF e abre até arquivos protegidos.', 'comprimir pdf reduzir tamanho pdf diminuir pdf', 'Diminua o peso de PDFs pesados (digitalizações, livros). Também abre PDFs com proteção de edição.'],
  ['imagem-para-pdf', 'pdf', 'pdf', '📷', 'Imagem para PDF', 'Transforma fotos e imagens em um PDF só.', 'imagem para pdf jpg para pdf png para pdf foto pdf', 'Transforme uma ou várias imagens em um único PDF, escolhendo tamanho de página e margem.'],
  ['pdf-para-imagem', 'pdf', 'pdf', '🖼️', 'PDF para imagem', 'Converte cada página do PDF em PNG ou JPG.', 'pdf para imagem pdf para jpg pdf para png', 'Converta as páginas de um PDF em imagens PNG ou JPG e baixe tudo em um ZIP.'],
  ['extrair-paginas-pdf', 'pdf', 'pdf', '📤', 'Extrair e reordenar páginas', 'Pega só as páginas que quiser, na ordem que quiser.', 'extrair páginas pdf remover páginas reordenar pdf organizar', 'Extraia, remova ou reordene páginas de um PDF informando os números, como 1-3, 7, 5.'],
  ['numerar-paginas-pdf', 'pdf', 'pdf', '🔖', 'Numerar páginas e marca d’água', 'Coloca número de página ou texto de marca d’água no PDF.', 'numerar páginas pdf marca d água pdf carimbo texto', 'Adicione numeração nas páginas ou uma marca d’água de texto em um PDF.'],

  ['calculadora-imc', 'calc', 'calc', '⚖️', 'Calculadora de IMC', 'Índice de massa corporal e faixa de peso.', 'calculadora imc índice de massa corporal peso ideal', 'Calcule o índice de massa corporal (IMC) a partir do peso e da altura e veja a classificação.'],
  ['juros-compostos', 'calc', 'calc', '📈', 'Juros compostos', 'Simula investimento com aporte mensal e juros.', 'juros compostos calculadora simulador investimento aporte mensal', 'Simule o crescimento de um valor com juros compostos e aportes mensais, com tabela mês a mês.'],
  ['porcentagem', 'calc', 'calc', '％', 'Calculadora de porcentagem', 'X% de Y, quanto por cento, aumento e desconto.', 'calculadora de porcentagem percentual desconto aumento', 'Calcule porcentagens: quanto é X% de Y, quantos por cento um valor é do outro, aumento e desconto.'],
  ['conversor-de-unidades', 'calc', 'calc', '📏', 'Conversor de unidades', 'Comprimento, peso, volume, temperatura, área e dados.', 'conversor de unidades metro pé polegada kg libra celsius fahrenheit', 'Converta unidades de comprimento, massa, volume, área, temperatura, velocidade e armazenamento.'],
  ['diferenca-entre-datas', 'calc', 'calc', '📅', 'Diferença entre datas e idade', 'Dias entre duas datas, idade exata e dias úteis.', 'diferença entre datas calcular idade dias úteis quantos dias faltam', 'Calcule quantos dias, meses e anos separam duas datas, a idade exata e os dias úteis do período.'],
  ['cronometro', 'calc', 'calc', '⏱️', 'Cronômetro e temporizador', 'Cronômetro com voltas e contagem regressiva com alarme.', 'cronômetro temporizador timer contagem regressiva online', 'Cronômetro com voltas e temporizador com alarme, que funcionam offline no celular.'],

  ['formatador-json', 'dev', 'dev', '{ }', 'Formatador de JSON', 'Formata, valida e minifica JSON.', 'formatador json validar json minificar beautify', 'Cole um JSON para formatar, validar, minificar ou ordenar as chaves. Aponta onde está o erro.'],
  ['base64', 'dev', 'dev', '🧩', 'Base64 codificar e decodificar', 'Texto e arquivos para Base64 e de volta.', 'base64 codificar decodificar encode decode', 'Codifique e decodifique Base64 de textos (com acentos) e de arquivos.'],
  ['codificar-url', 'dev', 'dev', '🔗', 'Codificar e decodificar URL', 'Encode e decode de URL e extração de parâmetros.', 'url encode decode codificar url percent encoding query string', 'Codifique e decodifique URLs e veja os parâmetros da query string em tabela.'],
  ['gerador-de-hash', 'dev', 'dev', '#️⃣', 'Gerador de hash', 'SHA-1, SHA-256, SHA-384 e SHA-512 de texto ou arquivo.', 'gerador de hash sha256 sha1 sha512 checksum arquivo', 'Calcule SHA-1, SHA-256, SHA-384 e SHA-512 de textos e arquivos para conferir integridade.'],
  ['conversor-de-cores', 'dev', 'dev', '🎨', 'Conversor de cores', 'HEX, RGB e HSL, com seletor de cor.', 'conversor de cores hex rgb hsl seletor de cor', 'Converta cores entre HEX, RGB e HSL e escolha visualmente em um seletor.'],
  ['conversor-de-timestamp', 'dev', 'dev', '🕒', 'Conversor de timestamp', 'Data para Unix timestamp e de volta.', 'timestamp unix epoch converter data', 'Converta timestamps Unix (segundos ou milissegundos) em datas legíveis e datas em timestamp.'],
  ['testador-regex', 'dev', 'dev', '🔍', 'Testador de Regex', 'Teste expressões regulares com destaque ao vivo.', 'testador de regex expressão regular regexp teste', 'Teste expressões regulares com destaque dos resultados, grupos de captura e substituição.'],
];

const RANK = Object.keys(CATS);
export const TOOLS = T.map(([slug, group, cat, icon, name, desc, kw, seo]) => ({ slug, group, cat, icon, name, desc, kw, seo })).sort((a, b) => RANK.indexOf(a.cat) - RANK.indexOf(b.cat));
export const bySlug = Object.fromEntries(TOOLS.map(t => [t.slug, t]));
