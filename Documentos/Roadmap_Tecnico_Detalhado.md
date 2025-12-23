# Roadmap Técnico - Pulso Esportivo (e Futuras Evoluções)

## Visão Geral
O **Pulso Esportivo** é uma plataforma pública de inteligência esportiva que coleta e processa grandes volumes de dados públicos das redes sociais e fontes de mídia para gerar rankings, gráficos e indicadores. O objetivo é apresentar de forma clara e acessível as discussões mais populares sobre esportes, utilizando exclusivamente dados públicos sem expor comentários individuais ou dados pessoais.

Além de esporte, a plataforma tem como plano evolutivo expandir para outras áreas de interesse público, como política, ciência, tecnologia, e outros temas de relevância social.

## Fase 1 - **Desenvolvimento da Plataforma Pulso Esportivo (Esporte)**

### **Objetivo**:
Construir a infraestrutura básica da plataforma, com coleta, processamento e visualização de dados sobre esportes.

### **Tarefas**:

1. **Coleta de Dados**:
   - Integrar APIs de fontes públicas como **Reddit**, **YouTube**, **Google Trends**.
   - Desenvolver e testar scripts de coleta de dados (mock para testes iniciais).
   - Criar estrutura para importar dados em tempo real para o banco de dados do **Supabase**.

2. **Processamento de Dados**:
   - Implementar scripts para agregação de dados diários, utilizando funções como `aggregate_daily_metrics` no Supabase.
   - Criar rotinas de normalização de dados coletados (como normalização de volume de menções).

3. **Banco de Dados**:
   - Configurar **Supabase** como banco de dados relacional.
   - Criar tabelas para armazenar dados de clubes, fontes, rankings diários e métricas de sentimento.
   - Implementar processos para inserir e atualizar dados no banco automaticamente.

4. **API**:
   - Desenvolver API com **FastAPI** para expor endpoints como `/daily_ranking`, `/clubs`, `/sources`, `/daily_iap`.
   - Garantir que a API retorne dados estruturados, como rankings de clubes, e métricas de interação.

5. **Interface de Visualização**:
   - (Opcional) Integrar API com front-end simples, utilizando **Next.js** ou outra framework, para exibir gráficos e rankings de clubes.
   - (Futuramente) Implementar gráficos dinâmicos e interativos de performance dos clubes ao longo do tempo.

## Fase 2 - **Expansão para Outras Áreas de Interesse**

### **Objetivo**:
Expandir a plataforma para cobrir mais áreas de interesse público além do esporte, como política, ciência e tecnologia.

### **Tarefas**:

1. **Definição de Áreas de Expansão**:
   - Identificar e definir fontes públicas de dados para as novas áreas (ex: fontes de dados sobre política, ciência, etc.).
   - Adaptar a arquitetura para incluir novos tipos de dados sem comprometer a performance e escalabilidade.

2. **Coleta de Dados Adicionais**:
   - Criar módulos de coleta específicos para cada nova área (por exemplo, coletar dados de discussões políticas no Reddit ou em fóruns especializados).
   - Integrar essas novas fontes ao pipeline de dados existente.

3. **Processamento e Agregação**:
   - Adaptar os scripts de agregação de dados para cada nova área de interesse.
   - Garantir que o processamento de dados seja eficiente para grandes volumes de dados de múltiplas áreas.

4. **API e Expansão de Endpoints**:
   - Desenvolver novos endpoints na API para expor os dados das novas áreas (por exemplo, `/political_ranking`, `/science_ranking`).
   - Criar filtros para permitir que os usuários selecionem a área de interesse ao consultar os rankings e gráficos.

5. **Interface de Visualização (Expansão)**:
   - Atualizar a interface para permitir a visualização dos dados de múltiplas áreas (esporte, política, ciência, etc.).
   - Adicionar filtros na interface para permitir a seleção de categoria (por exemplo, escolher entre rankings de clubes esportivos, partidos políticos, etc.).

## Fase 3 - **Escalabilidade e Melhoria Contínua**

### **Objetivo**:
Melhorar a escalabilidade da plataforma e garantir que ela possa lidar com grandes volumes de dados à medida que as áreas de interesse e as fontes de dados crescem.

### **Tarefas**:

1. **Otimização de Banco de Dados**:
   - Refatorar o banco de dados para garantir eficiência em consultas complexas e grandes volumes de dados.
   - Implementar técnicas de indexação e particionamento de tabelas no **Supabase** para melhorar a performance.

2. **Escalabilidade da API**:
   - Melhorar a API para lidar com grandes volumes de requisições.
   - Implementar cache para endpoints mais requisitados.

3. **Monitoramento e Manutenção**:
   - Implementar monitoramento de performance e uso de recursos.
   - Criar alertas para falhas na coleta de dados ou processamento.

4. **Melhorias na Interface**:
   - Adicionar mais recursos interativos na interface (ex: filtros avançados, comparações entre áreas de interesse, etc.).
   - Implementar funcionalidades de compartilhamento de dados para promover o uso público da plataforma.

## Fase 4 - **Lançamento e Marketing Público**

### **Objetivo**:
Lançar a plataforma ao público e promover seu uso nas áreas de interesse selecionadas.

### **Tarefas**:

1. **Lançamento Oficial**:
   - Configurar servidores para garantir a disponibilidade pública da plataforma.
   - Realizar testes de carga e estresse para garantir a robustez da plataforma.

2. **Marketing e Divulgação**:
   - Criar materiais de marketing explicando como a plataforma funciona.
   - Promover a plataforma nas redes sociais e outras mídias relevantes.
