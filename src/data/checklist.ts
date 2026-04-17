// Checklist padrão — 6 categorias, ~40 itens
// Cada item: o que observar, exemplo prático, sugestão automática
export type ChecklistItem = {
  key: string;
  nome: string;
  oQueObservar: string;
  exemplo: string;
  consequencia: string;
  sugestao: string;
};

export type ChecklistCategoria = {
  key: string;
  nome: string;
  emoji: string;
  itens: ChecklistItem[];
};

export const CHECKLIST: ChecklistCategoria[] = [
  {
    key: "motor",
    nome: "Motor",
    emoji: "🛠️",
    itens: [
      {
        key: "motor_partida",
        nome: "Partida a frio",
        oQueObservar: "Veículo deve ligar de primeira, sem ruídos estranhos.",
        exemplo: "Ligue com o motor frio. Se demorar a pegar ou estala, há sinal de falha.",
        consequencia: "Pode indicar bateria fraca, bicos sujos ou problemas de injeção.",
        sugestao: "Verificar bateria, velas e sistema de injeção em mecânico de confiança.",
      },
      {
        key: "motor_marcha_lenta",
        nome: "Marcha lenta",
        oQueObservar: "Rotação estável, sem vibrações ou oscilações.",
        exemplo: "Com motor quente e parado, observe se RPM oscila ou se o motor 'engasga'.",
        consequencia: "Marcha lenta irregular indica sensores ou bicos com problema.",
        sugestao: "Limpeza de bicos, verificação do sensor de TPS e MAP.",
      },
      {
        key: "motor_oleo_nivel",
        nome: "Nível e cor do óleo",
        oQueObservar: "Óleo deve estar entre min/max e cor âmbar (não preto/leitoso).",
        exemplo: "Vareta: óleo muito escuro = troca atrasada; leitoso = água no óleo.",
        consequencia: "Óleo leitoso indica junta de cabeçote queimada (custo alto).",
        sugestao: "Trocar óleo. Se leitoso, NÃO COMPRAR sem laudo de cabeçote.",
      },
      {
        key: "motor_vazamentos",
        nome: "Vazamentos no motor",
        oQueObservar: "Verificar embaixo do motor, tampa de válvulas e cárter.",
        exemplo: "Manchas de óleo recentes no chão ou crostas pretas no bloco.",
        consequencia: "Vazamentos podem evoluir e danificar componentes.",
        sugestao: "Identificar origem e orçar reparo (juntas/retentores).",
      },
      {
        key: "motor_fumaca",
        nome: "Fumaça no escapamento",
        oQueObservar: "Acelerar e observar cor: branca densa, azul ou preta = problema.",
        exemplo: "Fumaça azul = queima de óleo. Branca densa = água. Preta = injeção rica.",
        consequencia: "Sinal de motor desgastado, junta ou bico de injeção.",
        sugestao: "Avaliar com mecânico antes de comprar.",
      },
      {
        key: "motor_correia",
        nome: "Correia dentada / acessórios",
        oQueObservar: "Verificar estado, ressecamento e idade da troca.",
        exemplo: "Correia rachada ou com fiapos = troca urgente.",
        consequencia: "Quebra pode destruir o motor (em motores interferentes).",
        sugestao: "Pedir nota fiscal da última troca; se passou de 60 mil km, trocar.",
      },
      {
        key: "motor_radiador",
        nome: "Radiador e líquido de arrefecimento",
        oQueObservar: "Líquido deve estar no nível, sem manchas de óleo ou ferrugem.",
        exemplo: "Reservatório com óleo boiando = problema sério no motor.",
        consequencia: "Superaquecimento pode fundir o motor.",
        sugestao: "Trocar fluido e verificar mangueiras; se contaminado, investigar cabeçote.",
      },
    ],
  },
  {
    key: "estrutura",
    nome: "Estrutura e Lataria",
    emoji: "🚗",
    itens: [
      {
        key: "estr_alinhamento_paineis",
        nome: "Alinhamento de painéis",
        oQueObservar: "Folgas iguais entre portas, capô e porta-malas.",
        exemplo: "Folga assimétrica = sinal de batida e reparo malfeito.",
        consequencia: "Pode esconder dano estrutural grave.",
        sugestao: "Pedir laudo cautelar.",
      },
      {
        key: "estr_pintura",
        nome: "Pintura e textura",
        oQueObservar: "Diferenças de tom, casca de laranja, sobrespray.",
        exemplo: "Tom diferente entre paralama e porta indica repintura.",
        consequencia: "Pode indicar batida, ferrugem coberta ou desgaste.",
        sugestao: "Investigar histórico do veículo.",
      },
      {
        key: "estr_ferrugem",
        nome: "Ferrugem (assoalho, caixas de roda, soleiras)",
        oQueObservar: "Procurar bolhas de tinta, oxidação e furos.",
        exemplo: "Soleira corroída ou assoalho com ferrugem profunda.",
        consequencia: "Compromete segurança estrutural.",
        sugestao: "Se houver ferrugem profunda, evitar a compra.",
      },
      {
        key: "estr_chassi",
        nome: "Chassi / longarinas",
        oQueObservar: "Deformações, soldas estranhas, marcas de bater martelo.",
        exemplo: "Solda nova em longarina = sinal claro de batida grave.",
        consequencia: "Veículo perde rigidez e segurança.",
        sugestao: "Recomendado: laudo cautelar oficial.",
      },
      {
        key: "estr_vidros",
        nome: "Vidros e marcações",
        oQueObservar: "Códigos de fabricação devem coincidir entre vidros.",
        exemplo: "Um vidro com data muito diferente dos outros = trocado por batida.",
        consequencia: "Indica reparo de batida séria.",
        sugestao: "Investigar histórico.",
      },
      {
        key: "estr_porta_malas",
        nome: "Porta-malas / estepe",
        oQueObservar: "Verificar se há ferrugem, infiltração e estado do estepe.",
        exemplo: "Carpete molhado = vazamento; estepe murcho = mau cuidado.",
        consequencia: "Infiltrações causam problemas elétricos e ferrugem.",
        sugestao: "Identificar fonte da infiltração antes de comprar.",
      },
    ],
  },
  {
    key: "suspensao",
    nome: "Suspensão e Direção",
    emoji: "🛞",
    itens: [
      {
        key: "susp_amortecedores",
        nome: "Amortecedores",
        oQueObservar: "Pressionar cada canto: deve voltar em 1-2 oscilações.",
        exemplo: "Carro continua balançando = amortecedor vencido.",
        consequencia: "Reduz aderência, especialmente em curvas/chuva.",
        sugestao: "Trocar par dianteiro e/ou traseiro.",
      },
      {
        key: "susp_ruidos",
        nome: "Ruídos em buracos",
        oQueObservar: "Bater devagar em lombada/buraco e ouvir.",
        exemplo: "Estalos = bandejas, pivôs ou bieletas.",
        consequencia: "Itens de segurança; podem deixar veículo instável.",
        sugestao: "Diagnosticar em rampa.",
      },
      {
        key: "susp_alinhamento",
        nome: "Alinhamento e direção",
        oQueObservar: "Volante centralizado, sem puxar para o lado em reta.",
        exemplo: "Volante torto ou veículo 'puxando' = desalinhado ou batido.",
        consequencia: "Desgaste irregular dos pneus e risco em curvas.",
        sugestao: "Alinhamento e balanceamento; investigar batida se persistir.",
      },
      {
        key: "susp_direcao",
        nome: "Folga na direção",
        oQueObservar: "Volante deve responder sem zona morta.",
        exemplo: "Girar sem que rodas reajam = folga em terminais ou caixa.",
        consequencia: "Direção instável.",
        sugestao: "Avaliar terminais e caixa de direção.",
      },
      {
        key: "susp_pneus",
        nome: "Pneus (desgaste e marca)",
        oQueObservar: "Profundidade do sulco, desgaste irregular, marca confiável.",
        exemplo: "Desgaste só no centro = pressão alta; nas bordas = baixa.",
        consequencia: "Pneus ruins comprometem freios e segurança.",
        sugestao: "Trocar pneus vencidos; preferir marcas reconhecidas.",
      },
    ],
  },
  {
    key: "freios",
    nome: "Freios",
    emoji: "🛑",
    itens: [
      {
        key: "freios_pedal",
        nome: "Pressão do pedal",
        oQueObservar: "Pedal firme, sem ir até o fundo.",
        exemplo: "Pedal afundando ou esponjoso = ar no sistema ou cilindro mestre.",
        consequencia: "Falha na frenagem.",
        sugestao: "Sangrar sistema; trocar cilindro se persistir.",
      },
      {
        key: "freios_disco_pastilha",
        nome: "Discos e pastilhas",
        oQueObservar: "Espessura, marcas profundas e ruídos.",
        exemplo: "Disco com ressalto profundo = trocar; pastilha gasta = trocar.",
        consequencia: "Diminui eficiência da frenagem.",
        sugestao: "Trocar pastilhas/disco conforme desgaste.",
      },
      {
        key: "freios_estacionamento",
        nome: "Freio de estacionamento",
        oQueObservar: "Deve segurar o carro firme em rampa.",
        exemplo: "Não segura em descida = cabo esticado ou sapatas gastas.",
        consequencia: "Carro pode descer sozinho.",
        sugestao: "Regular cabo; trocar sapatas/lonas.",
      },
      {
        key: "freios_abs",
        nome: "Luz de ABS",
        oQueObservar: "Acende ao ligar e apaga em segundos.",
        exemplo: "Luz acesa direto = sensor de ABS com defeito.",
        consequencia: "Sistema desativado em frenagem brusca.",
        sugestao: "Diagnóstico com scanner; trocar sensor.",
      },
    ],
  },
  {
    key: "eletrica",
    nome: "Elétrica",
    emoji: "⚡",
    itens: [
      {
        key: "elet_painel",
        nome: "Luzes do painel",
        oQueObservar: "Ao ligar, todas acendem e apagam após dar partida.",
        exemplo: "Luz de injeção/airbag/ABS acesa = problema ativo.",
        consequencia: "Indica falha — precisa de scanner.",
        sugestao: "Fazer leitura de códigos antes de comprar.",
      },
      {
        key: "elet_farois",
        nome: "Faróis e lanternas",
        oQueObservar: "Baixo, alto, milha, lanternas, freio, ré e setas.",
        exemplo: "Lâmpada queimada ou foco torto.",
        consequencia: "Multa e risco à noite.",
        sugestao: "Trocar lâmpadas; regular farol.",
      },
      {
        key: "elet_vidros_travas",
        nome: "Vidros e travas elétricas",
        oQueObservar: "Subir/descer todos os vidros e testar travas.",
        exemplo: "Vidro lento ou trava falha = motor ou módulo com defeito.",
        consequencia: "Conforto e segurança.",
        sugestao: "Trocar motor/módulo conforme caso.",
      },
      {
        key: "elet_ar_condicionado",
        nome: "Ar-condicionado",
        oQueObservar: "Gela em poucos minutos, sem ruídos.",
        exemplo: "Sopra morno ou faz barulho = falta de gás ou compressor.",
        consequencia: "Reparo de A/C pode custar caro.",
        sugestao: "Carga de gás; orçar compressor se necessário.",
      },
      {
        key: "elet_bateria",
        nome: "Bateria",
        oQueObservar: "Idade da bateria e estado dos terminais.",
        exemplo: "Terminais com pó branco = oxidação; bateria > 3 anos = trocar.",
        consequencia: "Falha de partida e prejuízo eletrônico.",
        sugestao: "Limpar terminais; trocar se idade alta.",
      },
      {
        key: "elet_multimidia",
        nome: "Multimídia / som",
        oQueObservar: "Tela funcionando, alto-falantes sem chiado.",
        exemplo: "Tela travando ou som distorcido.",
        consequencia: "Custo de troca pode ser alto.",
        sugestao: "Avaliar trocar para modelo aftermarket.",
      },
    ],
  },
  {
    key: "interior",
    nome: "Interior",
    emoji: "🪑",
    itens: [
      {
        key: "int_bancos",
        nome: "Bancos e estofamento",
        oQueObservar: "Rasgos, manchas, esponja afundada, regulagens.",
        exemplo: "Banco do motorista muito desgastado para a km informada = suspeita.",
        consequencia: "Pode indicar km adulterada.",
        sugestao: "Investigar histórico e km real.",
      },
      {
        key: "int_volante_cambio",
        nome: "Volante e câmbio",
        oQueObservar: "Couro / plástico desgastado.",
        exemplo: "Volante muito polido em carro com pouca km.",
        consequencia: "Sinal de km adulterada.",
        sugestao: "Pedir histórico de revisões.",
      },
      {
        key: "int_cintos",
        nome: "Cintos de segurança",
        oQueObservar: "Travam quando puxados rapidamente; sem rasgos.",
        exemplo: "Cinto não trava = mecanismo falho.",
        consequencia: "Risco grave em colisão.",
        sugestao: "Trocar cinto.",
      },
      {
        key: "int_tapetes_carpete",
        nome: "Tapetes e carpete",
        oQueObservar: "Umidade ou cheiro de mofo = vazamento.",
        exemplo: "Carpete molhado embaixo do tapete.",
        consequencia: "Curto-circuito e ferrugem.",
        sugestao: "Identificar origem do vazamento.",
      },
      {
        key: "int_odor",
        nome: "Odor (mofo, queimado, combustível)",
        oQueObservar: "Cheiro de gasolina = vazamento; mofo = água; queimado = elétrica.",
        exemplo: "Cheiro forte ao ligar o A/C = ar contaminado.",
        consequencia: "Pode esconder problemas sérios.",
        sugestao: "Investigar e higienizar.",
      },
      {
        key: "int_documentacao",
        nome: "Documentação básica",
        oQueObservar: "CRLV em dia, IPVA, multas, chassi e motor batem.",
        exemplo: "Chassi grafado diferente do documento = grave.",
        consequencia: "Veículo pode ter origem ilícita.",
        sugestao: "Consultar Detran e fazer vistoria cautelar.",
      },
    ],
  },
];

// Total de itens (útil para barra de progresso)
export const TOTAL_ITENS = CHECKLIST.reduce((s, c) => s + c.itens.length, 0);

// Categorias críticas para regras inteligentes
export const CATEGORIAS_CRITICAS = ["motor", "estrutura", "freios"];
