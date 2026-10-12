# T-Escalas para a web

Recriação do aplicativo educativo T-Escalas, com os modos de jogo recuperados da versão Windows `T-EscalasDeploy4.zip`. A interface reaproveita o fundo, logotipo, botões, diagramas e músicas do original.

**[Jogar no navegador](https://glauberlasantiago.github.io/t-escalas/)**

## Jogar

- **Exercícios:** reconheça o tipo de escala, complete a meta antes do fim do tempo e desbloqueie fases. São quatro categorias: Maiores e Menores, 3 Menores, Modos Gregos e Especiais, com 28 fases no total.
- **Praticar:** treino visual ou auditivo sem limite de tempo; escolha categoria, direção e clave.
- **Fundamentos:** nove capítulos originais, com figuras e explicações.
- **Perfis:** progresso e dificuldade independentes por jogador, salvos no navegador.

As dificuldades são Elementar, Fácil, Médio e Difícil. O nível escolhido determina tempo, acertos exigidos, erros consecutivos permitidos e duração do feedback. As fases auditivas apresentam o som sem revelar a pauta.

## Executar

Node.js 20 ou superior; nenhuma instalação de dependências é necessária.

```sh
npm start
```

Abra http://127.0.0.1:4187. Para executar os testes:

```sh
npm test
```

Pode ser hospedado em qualquer servidor estático, incluindo GitHub Pages. Os caminhos relativos permitem publicar sob `/t-escalas/`. Não exige Unity, contas externas ou backend. Áudio requer uma interação do usuário. Os perfis ficam neste navegador; limpar os dados do site remove o progresso local.

## Regras preservadas

- Vitória somente quando o tempo termina, caso a meta de acertos tenha sido cumprida.
- Derrota antecipada ao atingir o limite de erros consecutivos.
- Acerto zera a sequência de erros e conta imediatamente; erro conta depois da pausa de feedback.
- O relógio continua durante o feedback.
- Direção “ambas” sorteia subida ou descida a cada pergunta.
- Menor melódica bachiana mantém a sexta e a sétima elevadas nas duas direções.
- Trocar a dificuldade reinicia as fases daquela categoria.
- Tonalidades e grafias são as variantes recuperadas do código, incluindo armaduras, bequadros e grafias distintas na descida.

## Fidelidade e adaptações

As regras e fases foram recuperadas com REA e conferidas com o executável em funcionamento. Esta implementação usa HTML, CSS, JavaScript, SVG e Web Audio. O layout adapta as telas ao celular e a outros tamanhos; não é uma exportação WebGL nem uma réplica pixel a pixel. A pauta dinâmica escreve os acidentes junto às notas para manter legibilidade em tela pequena. O som das escalas é sintetizado; as trilhas de fundo são os áudios originais. As amostras de piano extraídas também estão preservadas em `assets/audio`, mas não foram adotadas sem confirmar sua referência de oitava.

Veja [comportamento recuperado](docs/original-behavior.md), [configurações originais](docs/original-gameplay.json) e [validação](docs/validation.md).

## Créditos

Conceito e música: Glauber Santiago e Terence P. Santos. Programação original: Elias Ximenes. Arte: Emyr Ferrario. iMAX Games, MZO Interativa, UFSCar, UAB, SEaD e Licenciatura em Educação Musical.

Os recursos originais foram extraídos do pacote indicado pelo proprietário deste repositório. Os créditos são mantidos; nenhuma licença de terceiros foi presumida ou acrescentada.
