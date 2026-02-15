# Content Orchestrator - Memória

## Processo de Criação de Conteúdo

### Pipeline Estabelecido

1. **Verificação Prévia**: Sempre verificar se a página existe no Notion antes de iniciar
2. **Confirmação do Utilizador**: Obter confirmação explícita antes de começar o processo
3. **Fases Sequenciais**:
   - Pesquisa (Status: "Em Pesquisa")
   - Formatação (Status: "Em Formatação")
   - Revisão (Status: "Em Revisão")
   - Conclusão (Status: "Concluído - Revisão")

### Fontes Prioritárias

1. **pedronoia.pt/m24a/** - Excelente para conteúdo conceitual e estrutura curricular
   - Navegar: m24a10.htm → tema específico → subtema
   - Contém estrutura clara dos conceitos e fases

2. **matematicaparatodos.pt** - Fonte recomendada para exercícios
   - PDFs organizados por tema
   - Inclui resoluções

3. **mat.absolutamente.net** - Compilações úteis
   - Exercícios de exames organizados

4. **matematica.pt** - Recursos interativos GeoGebra

### Formato das Páginas Notion

**Estrutura Padrão**:

- Ícone no título (ex: 📊)
- Callout cinza inicial com definição principal
- Secções com ícones:
  - ➡️ Conceitos/Aplicação
  - 🔄 Processos/Fases (quando aplicável)
  - 📝 Fórmulas (quando aplicável)
  - 📏 Medidas/Dimensões (quando aplicável)
  - 💡 Notas Importantes
- Exemplos práticos em subsecções
- Fórmulas em LaTeX inline: $`formula`$

**Princípios de Formatação**:

- Linguagem humanizada e clara (público 15-17 anos)
- Evitar excesso de negrito/itálico
- Incluir exemplos práticos e relacionáveis
- Manter consistência visual com páginas existentes

### MCP Notion - Comandos Úteis

```bash
# Pesquisar página
mcp-cli call claude_ai_Notion/notion-search '{"query": "termo", "query_type": "internal"}'

# Obter conteúdo
mcp-cli call claude_ai_Notion/notion-fetch '{"id": "page-id"}'

# Atualizar propriedades
mcp-cli call claude_ai_Notion/notion-update-page '{"data": {"page_id": "id", "command": "update_properties", "properties": {"Status": "valor"}}}'

# Substituir conteúdo completo
mcp-cli call claude_ai_Notion/notion-update-page - <<'EOF'
{"data": {"page_id": "id", "command": "replace_content", "new_str": "conteúdo"}}
EOF
```

### Coordenação de Agentes

**Lições Aprendidas**:

- Os agentes personalizados (source-researcher, notion-page-formatter, etc.) estão definidos mas não são invocados via Skill
- O Content Orchestrator executa o trabalho diretamente, seguindo os princípios de cada agente especializado
- Task tracking é útil para organizar o fluxo de trabalho
- Status updates no Notion mantêm o utilizador informado do progresso
