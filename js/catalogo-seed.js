/* Catalogo recuperado do aplicativo anterior (42 itens com precos) */
var CATALOGO_SEED = [
  {
    "id": 1,
    "categoria": "MOBILIÁRIO & MESAS",
    "nome": "Jogo de Mesa com 4 Cadeiras de Plástico (Branca)",
    "unidade": "Jogo",
    "preco": 14.0,
    "estoque": 50,
    "foto": "foto-24.jpg",
    "ativo": true
  },
  {
    "id": 2,
    "categoria": "MOBILIÁRIO & MESAS",
    "nome": "Mesa Redonda de 6 Lugares (com tampão de madeira)",
    "unidade": "Unidade",
    "preco": 18.0,
    "estoque": 20,
    "foto": "foto-05.jpg",
    "ativo": true
  },
  {
    "id": 3,
    "categoria": "MOBILIÁRIO & MESAS",
    "nome": "Mesa Redonda de 7 Lugares (com tampão de madeira)",
    "unidade": "Unidade",
    "preco": 20.0,
    "estoque": 20,
    "foto": "foto-18.jpg",
    "ativo": true
  },
  {
    "id": 4,
    "categoria": "MOBILIÁRIO & MESAS",
    "nome": "Aparador de Madeira (2,50m x 0,80m)",
    "unidade": "Unidade",
    "preco": 25.0,
    "estoque": 5,
    "foto": "foto-07.jpg",
    "ativo": true
  },
  {
    "id": 5,
    "categoria": "TOALHAS & ENXOVAL",
    "nome": "Toalha Quadrada para 4 Lugares (1,50m x 1,50m)",
    "unidade": "Unidade",
    "preco": 6.0,
    "estoque": 100,
    "foto": "foto-08.jpg",
    "ativo": true
  },
  {
    "id": 6,
    "categoria": "TOALHAS & ENXOVAL",
    "nome": "Toalha Redonda para 6 e 7 Lugares (Cor Lisa)",
    "unidade": "Unidade",
    "preco": 12.0,
    "estoque": 80,
    "foto": "foto-15.jpg",
    "ativo": true
  },
  {
    "id": 7,
    "categoria": "TOALHAS & ENXOVAL",
    "nome": "Toalha para Aparador",
    "unidade": "Unidade",
    "preco": 25.0,
    "estoque": 10,
    "foto": "foto-07.jpg",
    "ativo": true
  },
  {
    "id": 8,
    "categoria": "PRATARIA",
    "nome": "Prato de jantar raso branco liso",
    "unidade": "Unidade",
    "preco": 0.8,
    "estoque": 300,
    "foto": "foto-16.jpg",
    "ativo": true
  },
  {
    "id": 9,
    "categoria": "LOUÇAS, TALHERES & COPOS",
    "nome": "Copo Tradicional",
    "unidade": "Unidade",
    "preco": 0.8,
    "estoque": 300,
    "foto": "foto-21.jpg",
    "ativo": true
  },
  {
    "id": 10,
    "categoria": "LOUÇAS, TALHERES & COPOS",
    "nome": "Taça para Água",
    "unidade": "Unidade",
    "preco": 1.0,
    "estoque": 200,
    "foto": "foto-13.jpg",
    "ativo": true
  },
  {
    "id": 11,
    "categoria": "LOUÇAS, TALHERES & COPOS",
    "nome": "Taça Colorida",
    "unidade": "Unidade",
    "preco": 1.5,
    "estoque": 150,
    "foto": "foto-09.jpg",
    "ativo": true
  },
  {
    "id": 12,
    "categoria": "SERVIÇO & RECHAUDS",
    "nome": "Richaud Redondo",
    "unidade": "Unidade",
    "preco": 25.0,
    "estoque": 10,
    "foto": "foto-22.jpg",
    "ativo": true
  },
  {
    "id": 13,
    "categoria": "SERVIÇO & RECHAUDS",
    "nome": "Ríchaud Quadrado 9 Litros",
    "unidade": "Unidade",
    "preco": 40.0,
    "estoque": 10,
    "foto": "foto-22.jpg",
    "ativo": true
  },
  {
    "id": 14,
    "categoria": "SERVIÇO & RECHAUDS",
    "nome": "Bandeja Oval Média",
    "unidade": "Unidade",
    "preco": 10.0,
    "estoque": 15,
    "foto": "foto-17.jpg",
    "ativo": true
  },
  {
    "id": 15,
    "categoria": "SERVIÇO & RECHAUDS",
    "nome": "Bandeja Oval Grande",
    "unidade": "Unidade",
    "preco": 15.0,
    "estoque": 15,
    "foto": "foto-17.jpg",
    "ativo": true
  },
  {
    "id": 16,
    "categoria": "SERVIÇO & RECHAUDS",
    "nome": "Bandeja para Garçom",
    "unidade": "Unidade",
    "preco": 10.0,
    "estoque": 10,
    "foto": "foto-17.jpg",
    "ativo": true
  },
  {
    "id": 17,
    "categoria": "SERVIÇO & RECHAUDS",
    "nome": "Pegador / Colher para Arroz ou Feijão Tropeiro",
    "unidade": "Unidade",
    "preco": 7.0,
    "estoque": 20,
    "foto": "foto-17.jpg",
    "ativo": true
  },
  {
    "id": 18,
    "categoria": "SERVIÇO & RECHAUDS",
    "nome": "Jarra em Inox",
    "unidade": "Unidade",
    "preco": 10.0,
    "estoque": 15,
    "foto": "foto-13.jpg",
    "ativo": true
  },
  {
    "id": 19,
    "categoria": "SERVIÇO & RECHAUDS",
    "nome": "Lixeira Redonda 7 Litros",
    "unidade": "Unidade",
    "preco": 25.0,
    "estoque": 10,
    "foto": "",
    "ativo": true
  },
  {
    "id": 20,
    "categoria": "EQUIPAMENTOS",
    "nome": "Freezer Horizontal Branca 2 Tampas (400 Litros)",
    "unidade": "Diária",
    "preco": 200.0,
    "estoque": 1,
    "foto": "",
    "ativo": true
  },
  {
    "id": 21,
    "categoria": "EQUIPAMENTOS",
    "nome": "Freezer Horizontal Branca 2 Tampas (500 Litros)",
    "unidade": "Diária",
    "preco": 250.0,
    "estoque": 2,
    "foto": "",
    "ativo": true
  },
  {
    "id": 22,
    "categoria": "PRATARIA",
    "nome": "Prato de jantar raso Branco Detalhado",
    "unidade": "Unidade",
    "preco": 0.8,
    "estoque": 300,
    "foto": "foto-16.jpg",
    "ativo": true
  },
  {
    "id": 23,
    "categoria": "LOUÇAS, TALHERES & COPOS",
    "nome": "Taça Colorida Rosê",
    "unidade": "Unidade",
    "preco": 1.5,
    "estoque": 170,
    "foto": "foto-09.jpg",
    "ativo": true
  },
  {
    "id": 24,
    "categoria": "LOUÇAS, TALHERES & COPOS",
    "nome": "Taça Colorida Verde",
    "unidade": "Unidade",
    "preco": 1.5,
    "estoque": 170,
    "foto": "foto-09.jpg",
    "ativo": true
  },
  {
    "id": 25,
    "categoria": "LOUÇAS, TALHERES & COPOS",
    "nome": "Taça Colorida Azul",
    "unidade": "Unidade",
    "preco": 1.5,
    "estoque": 170,
    "foto": "foto-09.jpg",
    "ativo": true
  },
  {
    "id": 26,
    "categoria": "LOUÇAS, TALHERES & COPOS",
    "nome": "Taça Colorida Dourada",
    "unidade": "Unidade",
    "preco": 1.5,
    "estoque": 170,
    "foto": "foto-09.jpg",
    "ativo": true
  },
  {
    "id": 27,
    "categoria": "LOUÇAS, TALHERES & COPOS",
    "nome": "Taça Colorida Transparente",
    "unidade": "Unidade",
    "preco": 1.5,
    "estoque": 170,
    "foto": "foto-21.jpg",
    "ativo": true
  },
  {
    "id": 28,
    "categoria": "PRATARIA",
    "nome": "Prato de Sobremesa Branco",
    "unidade": "Unidade",
    "preco": 0.8,
    "estoque": 300,
    "foto": "foto-16.jpg",
    "ativo": true
  },
  {
    "id": 29,
    "categoria": "PRATARIA",
    "nome": "Garfo de jantar",
    "unidade": "Unidade",
    "preco": 0.8,
    "estoque": 300,
    "foto": "foto-17.jpg",
    "ativo": true
  },
  {
    "id": 30,
    "categoria": "PRATARIA",
    "nome": "Faca de jantar",
    "unidade": "Unidade",
    "preco": 0.8,
    "estoque": 300,
    "foto": "foto-17.jpg",
    "ativo": true
  },
  {
    "id": 31,
    "categoria": "PRATARIA",
    "nome": "Colher de sobremes",
    "unidade": "Unidade",
    "preco": 0.8,
    "estoque": 300,
    "foto": "foto-17.jpg",
    "ativo": true
  },
  {
    "id": 32,
    "categoria": "PRATARIA",
    "nome": "Garfo de Sobremesa",
    "unidade": "Unidade",
    "preco": 0.8,
    "estoque": 300,
    "foto": "foto-17.jpg",
    "ativo": true
  },
  {
    "id": 33,
    "categoria": "EQUIPAMENTOS",
    "nome": "Guardanapos",
    "unidade": "Unidade",
    "preco": 1.0,
    "estoque": 1000,
    "foto": "foto-18.jpg",
    "ativo": true
  },
  {
    "id": 34,
    "categoria": "EQUIPAMENTOS",
    "nome": "Cadeira de plastivo branca",
    "unidade": "Unidade",
    "preco": 3.0,
    "estoque": 20000,
    "foto": "foto-20.jpg",
    "ativo": true
  },
  {
    "id": 35,
    "categoria": "PRATARIA",
    "nome": "Faca de sobremesa",
    "unidade": "Unidade",
    "preco": 0.8,
    "estoque": 200,
    "foto": "foto-17.jpg",
    "ativo": true
  },
  {
    "id": 36,
    "categoria": "MOBILIÁRIO & MESAS",
    "nome": "Tampão de Madeira C/ Cavalete",
    "unidade": "Unidade",
    "preco": 10.0,
    "estoque": 50,
    "foto": "",
    "ativo": true
  },
  {
    "id": 37,
    "categoria": "TOALHAS & ENXOVAL",
    "nome": "Toalha redonda Vermelho Adasmascado",
    "unidade": "Unidade",
    "preco": 14.0,
    "estoque": 20,
    "foto": "foto-09.jpg",
    "ativo": true
  },
  {
    "id": 38,
    "categoria": "LOUÇAS, TALHERES & COPOS",
    "nome": "Rishalds",
    "unidade": "Unidade",
    "preco": 25.0,
    "estoque": 9,
    "foto": "foto-22.jpg",
    "ativo": true
  },
  {
    "id": 39,
    "categoria": "TOALHAS & ENXOVAL",
    "nome": "Toalha Palha Adamascado Redondo",
    "unidade": "Unidade",
    "preco": 14.0,
    "estoque": 40,
    "foto": "foto-15.jpg",
    "ativo": true
  },
  {
    "id": 40,
    "categoria": "EQUIPAMENTOS",
    "nome": "Baldinho de Acrílico",
    "unidade": "Unidade",
    "preco": 15.0,
    "estoque": 4,
    "foto": "foto-13.jpg",
    "ativo": true
  },
  {
    "id": 41,
    "categoria": "EQUIPAMENTOS",
    "nome": "Champanheira",
    "unidade": "Unidade",
    "preco": 30.0,
    "estoque": 3,
    "foto": "foto-13.jpg",
    "ativo": true
  },
  {
    "id": 42,
    "categoria": "TOALHAS & ENXOVAL",
    "nome": "Toalha Quadrada Verde Escuro",
    "unidade": "Unidade",
    "preco": 6.0,
    "estoque": 50,
    "foto": "foto-08.jpg",
    "ativo": true
  }
];
