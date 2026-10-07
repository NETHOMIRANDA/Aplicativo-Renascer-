/* =========================================================
   config.js - configurações FIXAS do aplicativo
   (valem para TODOS os aparelhos, inclusive o celular dos clientes)
   ========================================================= */
var RENASCER_CONFIG = {
  /* Endereço da ponte (Google Apps Script) que recebe os pedidos.
     Cole aqui o endereço terminado em /exec  (veja SINCRONIZAR_NUVEM.txt).
     Sem esse endereço os pedidos ficam só no celular de quem os fez. */
  nuvemUrl: "https://script.google.com/macros/s/AKfycbwN3kb3wFZyiV7FCqdzq1zws2AKxF-6rtjb3WQf20U9xAJGLRTuISxLUcy5Z-_NBf04DQ/exec",

  /* Ponto de partida do frete: CEP 74353-400 (Rua Presidente Rodrigues Alves,
     Jardim Presidente, Goiânia/GO). Coordenadas usadas só como ponto de referência. */
  baseCep: "74353400",
  baseLat: -16.7457271,
  baseLon: -49.3239588,

  /* Valor cobrado por km rodado (o administrador pode alterar em Ajustes). */
  freteKmValorPadrao: 4.4
};
