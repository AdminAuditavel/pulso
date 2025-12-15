# pulso-esportivo/pipeline/aggregate_daily.py

from datetime import datetime

from db.supabase import supabase


def main():
    day = datetime.utcnow().date()
    print(f"Executando agregação diária para {day}")

    response = supabase.rpc(
        "aggregate_daily_metrics",
        {"p_day": str(day)}
    ).execute()

    print("Agregação diária concluída com sucesso")


if __name__ == "__main__":
    main()
