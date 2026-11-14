
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "business_members": {
                  Row: {
                    "business_id": string,"created_at": string,"role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_members_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"businesses": {
                  Row: {
                    "alert_days_before": number,"created_at": string,"id": string,"is_demo": boolean,"last_reset_at": string | null,"municipality": string | null,"name": string,"phone_whatsapp": string | null,"province": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alert_days_before"?: number,"created_at"?: string,"id"?: string,"is_demo"?: boolean,"last_reset_at"?: string | null,"municipality"?: string | null,"name": string,"phone_whatsapp"?: string | null,"province"?: string
                  }
                  Update: {
                    "alert_days_before"?: number,"created_at"?: string,"id"?: string,"is_demo"?: boolean,"last_reset_at"?: string | null,"municipality"?: string | null,"name"?: string,"phone_whatsapp"?: string | null,"province"?: string
                  }
                  Relationships: [
                    
                  ]
                },"categories": {
                  Row: {
                    "business_id": string,"color": string,"icon": string | null,"id": string,"kind": Database["public"]['Enums']["movement_kind"],"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"color"?: string,"icon"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["movement_kind"],"name": string,"sort_order"?: number
                  }
                  Update: {
                    "business_id"?: string,"color"?: string,"icon"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["movement_kind"],"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"clients": {
                  Row: {
                    "business_id": string,"contact_name": string | null,"created_at": string,"id": string,"municipality": string | null,"name": string,"notes": string | null,"phone": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"contact_name"?: string | null,"created_at"?: string,"id"?: string,"municipality"?: string | null,"name": string,"notes"?: string | null,"phone"?: string | null
                  }
                  Update: {
                    "business_id"?: string,"contact_name"?: string | null,"created_at"?: string,"id"?: string,"municipality"?: string | null,"name"?: string,"notes"?: string | null,"phone"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "clients_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"debts": {
                  Row: {
                    "amount": number,"business_id": string,"client_id": string | null,"concept": string,"created_at": string,"currency": Database["public"]['Enums']["currency"],"direction": Database["public"]['Enums']["debt_direction"],"due_on": string,"id": string,"issued_on": string,"paid_amount": number,"supplier_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"business_id": string,"client_id"?: string | null,"concept": string,"created_at"?: string,"currency": Database["public"]['Enums']["currency"],"direction": Database["public"]['Enums']["debt_direction"],"due_on": string,"id"?: string,"issued_on"?: string,"paid_amount"?: number,"supplier_id"?: string | null
                  }
                  Update: {
                    "amount"?: number,"business_id"?: string,"client_id"?: string | null,"concept"?: string,"created_at"?: string,"currency"?: Database["public"]['Enums']["currency"],"direction"?: Database["public"]['Enums']["debt_direction"],"due_on"?: string,"id"?: string,"issued_on"?: string,"paid_amount"?: number,"supplier_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "debts_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "debts_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "debts_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                },"exchange_rates": {
                  Row: {
                    "business_id": string,"cup_per_unit": number,"currency": Database["public"]['Enums']["currency"],"date": string,"id": string,"note": string | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"cup_per_unit": number,"currency": Database["public"]['Enums']["currency"],"date": string,"id"?: string,"note"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "business_id"?: string,"cup_per_unit"?: number,"currency"?: Database["public"]['Enums']["currency"],"date"?: string,"id"?: string,"note"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "exchange_rates_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"movements": {
                  Row: {
                    "amount": number,"amount_cup": number | null,"amount_usd": number | null,"attachment_path": string | null,"business_id": string,"category_id": string | null,"client_id": string | null,"created_at": string,"created_by": string | null,"currency": Database["public"]['Enums']["currency"],"date": string,"debt_id": string | null,"id": string,"kind": Database["public"]['Enums']["movement_kind"],"method": Database["public"]['Enums']["payment_method"],"missing_rate": boolean,"note": string | null,"payroll_run_id": string | null,"rate_cup_usd": number | null,"rate_date": string | null,"source": Database["public"]['Enums']["movement_source"],"supplier_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"amount_cup"?: number | null,"amount_usd"?: number | null,"attachment_path"?: string | null,"business_id": string,"category_id"?: string | null,"client_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency": Database["public"]['Enums']["currency"],"date"?: string,"debt_id"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["movement_kind"],"method"?: Database["public"]['Enums']["payment_method"],"missing_rate"?: boolean,"note"?: string | null,"payroll_run_id"?: string | null,"rate_cup_usd"?: number | null,"rate_date"?: string | null,"source"?: Database["public"]['Enums']["movement_source"],"supplier_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number,"amount_cup"?: number | null,"amount_usd"?: number | null,"attachment_path"?: string | null,"business_id"?: string,"category_id"?: string | null,"client_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency"?: Database["public"]['Enums']["currency"],"date"?: string,"debt_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["movement_kind"],"method"?: Database["public"]['Enums']["payment_method"],"missing_rate"?: boolean,"note"?: string | null,"payroll_run_id"?: string | null,"rate_cup_usd"?: number | null,"rate_date"?: string | null,"source"?: Database["public"]['Enums']["movement_source"],"supplier_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "movements_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movements_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movements_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movements_debt_id_fkey"
      columns: ["debt_id"]
isOneToOne: false
      referencedRelation: "debts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movements_payroll_run_id_fkey"
      columns: ["payroll_run_id"]
isOneToOne: false
      referencedRelation: "payroll_runs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movements_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                },"payroll_items": {
                  Row: {
                    "base": number,"bonus": number,"currency": Database["public"]['Enums']["currency"],"deductions": number,"id": string,"net": number | null,"run_id": string,"worker_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "base": number,"bonus"?: number,"currency": Database["public"]['Enums']["currency"],"deductions"?: number,"id"?: string,"net"?: never,"run_id": string,"worker_id": string
                  }
                  Update: {
                    "base"?: number,"bonus"?: number,"currency"?: Database["public"]['Enums']["currency"],"deductions"?: number,"id"?: string,"net"?: never,"run_id"?: string,"worker_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payroll_items_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "payroll_runs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payroll_items_worker_id_fkey"
      columns: ["worker_id"]
isOneToOne: false
      referencedRelation: "workers"
      referencedColumns: ["id"]
    }
                  ]
                },"payroll_runs": {
                  Row: {
                    "business_id": string,"created_at": string,"id": string,"paid_on": string | null,"period": string,"status": Database["public"]['Enums']["payroll_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"id"?: string,"paid_on"?: string | null,"period": string,"status"?: Database["public"]['Enums']["payroll_status"]
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"id"?: string,"paid_on"?: string | null,"period"?: string,"status"?: Database["public"]['Enums']["payroll_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "payroll_runs_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"suppliers": {
                  Row: {
                    "business_id": string,"contact_name": string | null,"created_at": string,"id": string,"municipality": string | null,"name": string,"notes": string | null,"phone": string | null,"products": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"contact_name"?: string | null,"created_at"?: string,"id"?: string,"municipality"?: string | null,"name": string,"notes"?: string | null,"phone"?: string | null,"products"?: string | null
                  }
                  Update: {
                    "business_id"?: string,"contact_name"?: string | null,"created_at"?: string,"id"?: string,"municipality"?: string | null,"name"?: string,"notes"?: string | null,"phone"?: string | null,"products"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "suppliers_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"workers": {
                  Row: {
                    "active": boolean,"base_salary": number,"business_id": string,"created_at": string,"full_name": string,"hired_on": string,"id": string,"phone": string | null,"position": string,"salary_currency": Database["public"]['Enums']["currency"]
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"base_salary": number,"business_id": string,"created_at"?: string,"full_name": string,"hired_on"?: string,"id"?: string,"phone"?: string | null,"position": string,"salary_currency"?: Database["public"]['Enums']["currency"]
                  }
                  Update: {
                    "active"?: boolean,"base_salary"?: number,"business_id"?: string,"created_at"?: string,"full_name"?: string,"hired_on"?: string,"id"?: string,"phone"?: string | null,"position"?: string,"salary_currency"?: Database["public"]['Enums']["currency"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "workers_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "consolidate":
{ Args: { "p_amount": number,"p_business": string,"p_currency": Database["public"]['Enums']["currency"],"p_date": string }; Returns: Database["public"]['CompositeTypes']["consolidation"]
                          SetofOptions: {
        from: "*"
        to: "consolidation"
        isOneToOne: true
        isSetofReturn: false
      } },
"is_member":
{ Args: { "p_business": string }; Returns: boolean
                           },
"is_owner":
{ Args: { "p_business": string }; Returns: boolean
                           },
"rate_on":
{ Args: { "p_business": string,"p_currency": Database["public"]['Enums']["currency"],"p_date": string }; Returns: {
              "cup_per_unit": number,"rate_date": string
            }[]
                           },
"reconsolidate_movements":
{ Args: { "p_business": string,"p_currency": Database["public"]['Enums']["currency"],"p_from": string }; Returns: number
                           }
          }
          Enums: {
            "currency": "USD"|"CUP"|"EUR"|"MLC","debt_direction": "por_cobrar"|"por_pagar","member_role": "dueno"|"contador","movement_kind": "ingreso"|"gasto","movement_source": "rapido"|"completo"|"nomina"|"cuenta","payment_method": "efectivo"|"transferencia"|"zelle"|"tropipay"|"transfermovil","payroll_status": "borrador"|"pagada"
          }
          CompositeTypes: {
            "consolidation": {
                        "rate_date": string | null,"rate_cup_usd": number | null,"amount_usd": number | null,"amount_cup": number | null,"missing_rate": boolean | null
                      }
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "currency": ["USD", "CUP", "EUR", "MLC"],"debt_direction": ["por_cobrar", "por_pagar"],"member_role": ["dueno", "contador"],"movement_kind": ["ingreso", "gasto"],"movement_source": ["rapido", "completo", "nomina", "cuenta"],"payment_method": ["efectivo", "transferencia", "zelle", "tropipay", "transfermovil"],"payroll_status": ["borrador", "pagada"]
          }
        }
} as const
