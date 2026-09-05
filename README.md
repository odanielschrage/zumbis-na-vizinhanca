# 🧟 Zumbis na Vizinhança

Jogo de sobrevivência top-down inspirado em *Zombies Ate My Neighbors*, com visual
noturno moderno (iluminação dinâmica, partículas, sangue persistente) e co-op local
para até 2 jogadores. Feito em HTML5 Canvas + JavaScript puro — sem dependências.

## Como jogar

Abra um servidor local na pasta do projeto e acesse no navegador:

```
npx serve -l 5599 .
# depois abra http://localhost:5599
```

(Ou use qualquer servidor estático. Abrir o `index.html` direto com duplo clique
também funciona, pois não há módulos ES.)

## Controles

| Ação          | Jogador 1        | Jogador 2       |
| ------------- | ---------------- | --------------- |
| Mover         | W A S D          | Setas           |
| Mirar         | Mouse            | Direção do movimento |
| Atirar        | Clique / Espaço  | Enter           |
| Trocar arma   | Q                | Shift direito   |
| Pausar        | Esc              | Esc             |

**Todas essas teclas são remapeáveis.** Em *Configurar controles* (no menu ou na
pausa), clique numa tecla e aperte a nova. As escolhas ficam salvas no navegador
e valem para os dois jogadores independentemente.

- O jogo recusa uma tecla que já esteja em uso por outra ação (de qualquer
  jogador) e diz qual é o conflito, para você não ficar sem um comando.
- `Esc` é reservado para pausar e não pode ser mapeado; durante a captura, ele
  cancela.
- *Restaurar padrão* volta tudo à tabela acima.

## Visual

Todos os personagens são desenhados num estilo **cartoon 2D sombreado** (contorno,
gradiente e luz/sombra, sem pixel) — renderizados por `js/cartoon.js`.

## Personagens (com perks)

Depois de escolher 1 ou 2 jogadores, a tela de seleção mostra 4 heróis, cada um com um
**perk passivo** próprio:
- **Zeca** — 💥 Crítico: 25% de chance de dano dobrado.
- **Bruna** — ⚡ Ágil: +18% de velocidade.
- **Duda** — 🎒 Municiado: +50% de munição nos drops e cadência de tiro maior.
- **Rex** — 🛡️ Tanque: +30% de vida e recebe 15% menos dano.

O **sprite do herói mostra a arma equipada** (pistola, metralhadora, escopeta, lança-chamas, bazuca ou congelador).

## Modo história (fases)

O jogo é dividido em **fases** de 5 ondas cada, com um **chefe ao final de cada fase**.
Os cenários **ciclam automaticamente** a cada fase (e voltam a rodar, com dificuldade
crescente, indefinidamente):

- **Fase 1 · 🏘️ Subúrbio** — ruas em cruz, casas, carros, árvores, arbustos, hidrantes.
- **Fase 2 · 🪦 Cemitério** — lápides, criptas, árvores mortas, névoa e fogos-fátuos.
- **Fase 3 · 🏭 Zona Industrial** — galpões, contêineres, barris tóxicos e um mercadinho.
- **Fase 4+** — recomeça o ciclo, mais difícil.

Cada mapa tem decoração espalhada (flores, poças, ossos, óleo, mato) para variar o visual.

### Entrar em construções (objetivos dentro dos prédios)

Várias casas, criptas e galpões têm **interior**: ao entrar pela porta, o telhado some e
revela o cômodo (piso, móveis, tapetes, prateleiras com produtos). Vale a pena entrar:

- **Vizinhos escondidos** — parte dos resgatáveis se esconde dentro das construções.
- **Baús de tesouro** 📦 — cada fase esconde 1–2 baús dentro dos prédios; abrir dá uma
  **arma boa + munição + cura + pontos**.
- **Cofres trancados** 🔒 — cada fase tem um prédio **trancado** com um portão. Encontre a
  **chave** 🔑 (fica em área aberta no mapa; o HUD mostra quantas você tem) e encoste na porta
  do cofre para **destravar**: ele derrama uma recompensa grande (baús + itens + 500 pontos).

Setas na borda da tela apontam vizinhos (🙋), baús (📦), chaves (🔑) e o cofre (🔒, quando você
tem chave). Zumbis também entram nos prédios. Alguns estão **abandonados** (sem telhado) e podem
ser atravessados.

Tanto os **heróis quanto os monstros viram conforme a direção** que andam (frente, costas e perfil).

## Mecânicas

- **Ondas com variedade de monstros**, cada um com sprite e comportamento próprios:
  🧟 zumbi, 🐺 lobisomem (rápido), 🪚 maníaco de motosserra (rápido, forte),
  🧟‍♀️ múmia (lento, tanque), 👽 marciano (cospe ácido à distância),
  🪆 boneco assassino (minúsculo, enxame) e 💪 brutamontes (enorme). Aparecem
  gradualmente conforme a fase avança.
- **Chefe ao fim de cada fase** — com barra de vida própria e um segundo estágio (mais
  agressivo) abaixo de 50% de vida. Três se revezam:
  - 👹 **A Abominação** — investe e martela o chão causando dano em área.
  - 💀 **O Necromante** — teleporta, invoca lacaios e conjura leques de projéteis.
  - ☠️ **O Ceifador** — entra em modo sombra (rápido e resistente) e dispara rajadas.
  A cada ciclo completo eles voltam bem mais fortes.
- **Dificuldade selecionável** 😌🙂💀: Fácil, Normal e Difícil (menu) — muda vida/dano
  dos inimigos e a quantidade por onda; no Difícil os pontos rendem +30%. A escolha fica salva.
- **Recorde salvo** 🏆: melhor pontuação por dificuldade guardada no navegador, exibida
  no menu e na tela de fim de jogo (com aviso de NOVO RECORDE).
- **Objetivos especiais** 🎯: na 3ª onda de cada fase surge uma missão extra (rotaciona
  por fase): ☣ **destruir ninhos** que geram zumbis sem parar (+800), ⭐ **escoltar um
  vizinho VIP** até o sinalizador de extração (+900; se ele morrer, -300) ou 🚩 **defender
  uma zona** ficando dentro dela por 18s (+800). Setas e um letreiro no HUD guiam a missão.
- **Loja entre fases** 🛒: ao vencer uma fase (derrotar o chefe), abre uma loja onde você
  **gasta os pontos** (que viram moeda) em cura, vida máxima, velocidade, munição, armas
  (metralhadora, escopeta, congelador, lança-chamas, bazuca) e reviver o parceiro. Depois é só
  seguir para a próxima fase.
- **Combo**: abates encadeados (sem pausa longa) elevam o multiplicador de pontos
  de x1 até x5.
- **Power-ups temporários**: ⚡ velocidade (x1,5) e 🔥 dano dobrado (x2), por 8s.
- **Barris explosivos** 💥: atire nos tambores vermelhos (ou tóxicos) para causar dano em
  área e reação em cadeia — mas cuidado, o respingo também machuca você.
- **Co-op**: revive o parceiro caído ficando perto dele por ~2,4s (anel de progresso).
- **Feedback**: números de dano, hit-stop em golpes fortes e vinheta/batimento cardíaco
  com vida baixa. Volume de música e efeitos ajustável no menu e na pausa (salvo no navegador).
- **Vizinhos**: aparecem nas ondas normais pedindo socorro (`!`). Encoste para resgatar
  (+500 pts, cura 10). Se um zumbi alcançar antes… (-200 pts). Eles têm **IA de fuga**:
  quando um zumbi se aproxima, correm **em direção ao jogador** buscando proteção (e, se
  estiverem seguros mas longe, caminham calmamente até o herói). Setas na borda apontam onde estão.
- **Arsenal**: Pistola (munição infinita), Metralhadora, Escopeta e as armas especiais
  🔥 **Lança-chamas** (cone de fogo contínuo), 🚀 **Bazuca** (foguete que explode em área,
  ótimo com os barris) e ❄️ **Congelador** (congela o zumbi por 3s). Munição limitada,
  achadas em drops e baús. Kits médicos curam 35. Derrotar um chefe faz chover itens bons.
- **Co-op**: a câmera dá zoom out quando os jogadores se afastam. Quem morrer
  revive no começo da próxima onda ao lado do parceiro.

## Estrutura do código

```
index.html        — página, HUD (barra de chefe, combo) e menus (DOM)
css/style.css     — estilo do HUD, seleção de personagem e telas
js/utils.js       — matemática e colisões (círculo/retângulo)
js/audio.js       — sons procedurais + música de fundo adaptativa (WebAudio, sem arquivos):
                    Sound (efeitos) e Music (trilha em loop: menu/jogo/chefe)
js/input.js       — teclado e mouse
js/particles.js   — partículas (sangue, faíscas, flash de tiro)
js/cartoon.js     — motor de arte cartoon 2D: heróis, monstros, chefes, civis
                    (contorno/gradiente/sombra) + buffer para espelhar e flash de dano
js/world.js       — 3 mapas temáticos: obstáculos, construções com interior/telhado,
                    chão pré-renderizado, decalques, props e iluminação
js/entities.js    — Player, Zombie (7 tipos de monstro), Neighbor, Bullet, EnemyShot,
                    Pickup, Boss e tabelas de armas/chefes (desenho via cartoon.js)
js/game.js        — loop, fases/modo história (MAP_CYCLE), chefes, combo, câmera, HUD
```

> Observação: `js/pixel.js`, `js/sprites.js`, `sprites-preview.html` e
> `cartoon-preview.html` são apenas laboratórios de arte usados no desenvolvimento
> (não fazem parte do jogo em si).

## Acessibilidade

- **Modo daltônico** (opção no menu): troca os pares verde/vermelho por azul/laranja
  nas barras de vida, marcadores de objetivo e pills de dificuldade.
- **`prefers-reduced-motion`**: as animações de interface são desligadas
  automaticamente para quem configurou menos movimento no sistema.

## Deploy

O jogo é 100% estático (sem build, sem dependências), então qualquer host de
arquivos estáticos serve. A configuração do Vercel está em `vercel.json`.

**Vercel** — importe o repositório em [vercel.com/new](https://vercel.com/new).
Não há build: o preset é *Other* e o site é servido da raiz. Ou pela CLI:

```
npx vercel        # deploy de pré-visualização
npx vercel --prod # deploy de produção
```

Os arquivos de `js/` e `css/` são servidos com `must-revalidate`, então cada
deploy já aparece atualizado no navegador (sem cache velho).
