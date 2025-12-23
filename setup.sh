#!/bin/bash

# Verificar se o arquivo .env já existe
if [ ! -f .env ]; then
  echo "Criando o arquivo .env"

  # Adicionar as variáveis de ambiente necessárias no arquivo .env
  echo "SUPABASE_URL=https://fzskxuthignjrqncaeah.supabase.co" > .env
  echo "SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6c2t4dXRoaWduanJxbmNhZWFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgzMDM3NSwiZXhwIjoyMDgxNDA2Mzc1fQ.s4gBKZgPdZcYcBljCx7E1FoM7IxWaTovIZFJl2aFn_c" >> .env
else
  echo ".env já existe. Nenhuma ação necessária."
fi
