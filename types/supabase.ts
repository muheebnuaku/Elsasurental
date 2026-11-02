
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
            "addons": {
                  Row: {
                    "active": boolean,"created_at": string,"description": string | null,"id": string,"name": string,"price": number,"slug": string,"unit": Database["public"]['Enums']["addon_unit"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"description"?: string | null,"id"?: string,"name": string,"price": number,"slug": string,"unit"?: Database["public"]['Enums']["addon_unit"],"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"description"?: string | null,"id"?: string,"name"?: string,"price"?: number,"slug"?: string,"unit"?: Database["public"]['Enums']["addon_unit"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"booking_addons": {
                  Row: {
                    "addon_id": string,"booking_id": string,"created_at": string,"id": string,"qty": number,"unit_price": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "addon_id": string,"booking_id": string,"created_at"?: string,"id"?: string,"qty"?: number,"unit_price": number,"updated_at"?: string
                  }
                  Update: {
                    "addon_id"?: string,"booking_id"?: string,"created_at"?: string,"id"?: string,"qty"?: number,"unit_price"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "booking_addons_addon_id_fkey"
      columns: ["addon_id"]
isOneToOne: false
      referencedRelation: "addons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "booking_addons_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"bookings": {
                  Row: {
                    "admin_notes": string | null,"amount_paid": number,"buffer_minutes": number,"cancel_reason": string | null,"cancelled_at": string | null,"company_id": string | null,"contact_email": string | null,"contact_name": string,"contact_phone": string,"created_at": string,"currency": string,"customer_id": string | null,"deposit_amount": number,"destination_id": string | null,"discount": number,"distance_km": number | null,"driver_id": string | null,"dropoff": Json | null,"duration_minutes": number | null,"end_at": string,"group_id": string | null,"hold_expires_at": string | null,"id": string,"luggage": number,"notes": string | null,"passengers": number,"pickup": NonNullable<Json>,"promo_code_id": string | null,"quote_snapshot": NonNullable<Json>,"ref_code": string,"source": Database["public"]['Enums']["booking_source"],"start_at": string,"status": Database["public"]['Enums']["booking_status"],"stops": NonNullable<Json>,"subtotal": number,"total": number,"trip_type": Database["public"]['Enums']["trip_type"],"updated_at": string,"vehicle_id": string | null,"vehicle_type_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_notes"?: string | null,"amount_paid"?: number,"buffer_minutes"?: number,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"company_id"?: string | null,"contact_email"?: string | null,"contact_name": string,"contact_phone": string,"created_at"?: string,"currency"?: string,"customer_id"?: string | null,"deposit_amount"?: number,"destination_id"?: string | null,"discount"?: number,"distance_km"?: number | null,"driver_id"?: string | null,"dropoff"?: Json | null,"duration_minutes"?: number | null,"end_at": string,"group_id"?: string | null,"hold_expires_at"?: string | null,"id"?: string,"luggage"?: number,"notes"?: string | null,"passengers": number,"pickup": NonNullable<Json>,"promo_code_id"?: string | null,"quote_snapshot"?: NonNullable<Json>,"ref_code"?: string,"source"?: Database["public"]['Enums']["booking_source"],"start_at": string,"status"?: Database["public"]['Enums']["booking_status"],"stops"?: NonNullable<Json>,"subtotal": number,"total": number,"trip_type": Database["public"]['Enums']["trip_type"],"updated_at"?: string,"vehicle_id"?: string | null,"vehicle_type_id": string
                  }
                  Update: {
                    "admin_notes"?: string | null,"amount_paid"?: number,"buffer_minutes"?: number,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"company_id"?: string | null,"contact_email"?: string | null,"contact_name"?: string,"contact_phone"?: string,"created_at"?: string,"currency"?: string,"customer_id"?: string | null,"deposit_amount"?: number,"destination_id"?: string | null,"discount"?: number,"distance_km"?: number | null,"driver_id"?: string | null,"dropoff"?: Json | null,"duration_minutes"?: number | null,"end_at"?: string,"group_id"?: string | null,"hold_expires_at"?: string | null,"id"?: string,"luggage"?: number,"notes"?: string | null,"passengers"?: number,"pickup"?: NonNullable<Json>,"promo_code_id"?: string | null,"quote_snapshot"?: NonNullable<Json>,"ref_code"?: string,"source"?: Database["public"]['Enums']["booking_source"],"start_at"?: string,"status"?: Database["public"]['Enums']["booking_status"],"stops"?: NonNullable<Json>,"subtotal"?: number,"total"?: number,"trip_type"?: Database["public"]['Enums']["trip_type"],"updated_at"?: string,"vehicle_id"?: string | null,"vehicle_type_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_destination_id_fkey"
      columns: ["destination_id"]
isOneToOne: false
      referencedRelation: "destinations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "drivers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_promo_code_id_fkey"
      columns: ["promo_code_id"]
isOneToOne: false
      referencedRelation: "promo_codes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_vehicle_type_id_fkey"
      columns: ["vehicle_type_id"]
isOneToOne: false
      referencedRelation: "vehicle_types"
      referencedColumns: ["id"]
    }
                  ]
                },"business_settings": {
                  Row: {
                    "address": string,"email": string,"id": boolean,"phone": string,"updated_at": string,"whatsapp": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address": string,"email": string,"id"?: boolean,"phone": string,"updated_at"?: string,"whatsapp": string
                  }
                  Update: {
                    "address"?: string,"email"?: string,"id"?: boolean,"phone"?: string,"updated_at"?: string,"whatsapp"?: string
                  }
                  Relationships: [
                    
                  ]
                },"companies": {
                  Row: {
                    "billing_email": string | null,"created_at": string,"credit_terms_days": number,"discount_pct": number,"id": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "billing_email"?: string | null,"created_at"?: string,"credit_terms_days"?: number,"discount_pct"?: number,"id"?: string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "billing_email"?: string | null,"created_at"?: string,"credit_terms_days"?: number,"discount_pct"?: number,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"conversations": {
                  Row: {
                    "assigned_to": string | null,"channel": Database["public"]['Enums']["conversation_channel"],"created_at": string,"customer_id": string | null,"id": string,"last_message_at": string | null,"phone": string | null,"status": Database["public"]['Enums']["conversation_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_to"?: string | null,"channel": Database["public"]['Enums']["conversation_channel"],"created_at"?: string,"customer_id"?: string | null,"id"?: string,"last_message_at"?: string | null,"phone"?: string | null,"status"?: Database["public"]['Enums']["conversation_status"],"updated_at"?: string
                  }
                  Update: {
                    "assigned_to"?: string | null,"channel"?: Database["public"]['Enums']["conversation_channel"],"created_at"?: string,"customer_id"?: string | null,"id"?: string,"last_message_at"?: string | null,"phone"?: string | null,"status"?: Database["public"]['Enums']["conversation_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"destination_prices": {
                  Row: {
                    "destination_id": string,"price": number,"vehicle_type_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "destination_id": string,"price": number,"vehicle_type_id": string
                  }
                  Update: {
                    "destination_id"?: string,"price"?: number,"vehicle_type_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "destination_prices_destination_id_fkey"
      columns: ["destination_id"]
isOneToOne: false
      referencedRelation: "destinations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "destination_prices_vehicle_type_id_fkey"
      columns: ["vehicle_type_id"]
isOneToOne: false
      referencedRelation: "vehicle_types"
      referencedColumns: ["id"]
    }
                  ]
                },"destinations": {
                  Row: {
                    "active": boolean,"created_at": string,"description": string | null,"distance_km": number | null,"est_hours": number,"id": string,"image_url": string | null,"lat": number | null,"lng": number | null,"name": string,"region": string,"slug": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"description"?: string | null,"distance_km"?: number | null,"est_hours": number,"id"?: string,"image_url"?: string | null,"lat"?: number | null,"lng"?: number | null,"name": string,"region": string,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"description"?: string | null,"distance_km"?: number | null,"est_hours"?: number,"id"?: string,"image_url"?: string | null,"lat"?: number | null,"lng"?: number | null,"name"?: string,"region"?: string,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"driver_locations": {
                  Row: {
                    "booking_id": string | null,"created_at": string,"driver_id": string,"heading": number | null,"id": number,"lat": number,"lng": number,"recorded_at": string,"speed": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id"?: string | null,"created_at"?: string,"driver_id": string,"heading"?: number | null,"id"?: never,"lat": number,"lng": number,"recorded_at"?: string,"speed"?: number | null
                  }
                  Update: {
                    "booking_id"?: string | null,"created_at"?: string,"driver_id"?: string,"heading"?: number | null,"id"?: never,"lat"?: number,"lng"?: number,"recorded_at"?: string,"speed"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "driver_locations_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "driver_locations_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "drivers"
      referencedColumns: ["id"]
    }
                  ]
                },"drivers": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"licence_expiry": string,"licence_no": string,"photo_url": string | null,"profile_id": string,"rating": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"licence_expiry": string,"licence_no": string,"photo_url"?: string | null,"profile_id": string,"rating"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"licence_expiry"?: string,"licence_no"?: string,"photo_url"?: string | null,"profile_id"?: string,"rating"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "drivers_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"expenses": {
                  Row: {
                    "amount": number,"booking_id": string | null,"category": Database["public"]['Enums']["expense_category"],"created_at": string,"driver_id": string | null,"id": string,"notes": string | null,"receipt_path": string | null,"spent_at": string,"updated_at": string,"vehicle_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"booking_id"?: string | null,"category": Database["public"]['Enums']["expense_category"],"created_at"?: string,"driver_id"?: string | null,"id"?: string,"notes"?: string | null,"receipt_path"?: string | null,"spent_at"?: string,"updated_at"?: string,"vehicle_id": string
                  }
                  Update: {
                    "amount"?: number,"booking_id"?: string | null,"category"?: Database["public"]['Enums']["expense_category"],"created_at"?: string,"driver_id"?: string | null,"id"?: string,"notes"?: string | null,"receipt_path"?: string | null,"spent_at"?: string,"updated_at"?: string,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "expenses_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "drivers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"kb_documents": {
                  Row: {
                    "content": string,"created_at": string,"embedding": string | null,"id": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"created_at"?: string,"embedding"?: string | null,"id"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"embedding"?: string | null,"id"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"maintenance": {
                  Row: {
                    "cost": number,"created_at": string,"done_at": string,"id": string,"next_due_at": string | null,"notes": string | null,"type": string,"updated_at": string,"vehicle_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cost"?: number,"created_at"?: string,"done_at": string,"id"?: string,"next_due_at"?: string | null,"notes"?: string | null,"type": string,"updated_at"?: string,"vehicle_id": string
                  }
                  Update: {
                    "cost"?: number,"created_at"?: string,"done_at"?: string,"id"?: string,"next_due_at"?: string | null,"notes"?: string | null,"type"?: string,"updated_at"?: string,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "maintenance_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "content": string | null,"conversation_id": string,"created_at": string,"id": string,"role": Database["public"]['Enums']["message_role"],"tool_payload": Json | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content"?: string | null,"conversation_id": string,"created_at"?: string,"id"?: string,"role": Database["public"]['Enums']["message_role"],"tool_payload"?: Json | null,"updated_at"?: string
                  }
                  Update: {
                    "content"?: string | null,"conversation_id"?: string,"created_at"?: string,"id"?: string,"role"?: Database["public"]['Enums']["message_role"],"tool_payload"?: Json | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_log": {
                  Row: {
                    "booking_id": string | null,"channel": Database["public"]['Enums']["notification_channel"],"created_at": string,"dedupe_key": string,"error": string | null,"event": string,"id": string,"provider_id": string | null,"recipient": string | null,"status": Database["public"]['Enums']["notification_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id"?: string | null,"channel": Database["public"]['Enums']["notification_channel"],"created_at"?: string,"dedupe_key": string,"error"?: string | null,"event": string,"id"?: string,"provider_id"?: string | null,"recipient"?: string | null,"status": Database["public"]['Enums']["notification_status"]
                  }
                  Update: {
                    "booking_id"?: string | null,"channel"?: Database["public"]['Enums']["notification_channel"],"created_at"?: string,"dedupe_key"?: string,"error"?: string | null,"event"?: string,"id"?: string,"provider_id"?: string | null,"recipient"?: string | null,"status"?: Database["public"]['Enums']["notification_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_log_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"booking_id": string,"created_at": string,"currency": string,"id": string,"kind": Database["public"]['Enums']["payment_kind"],"method": Database["public"]['Enums']["payment_method"] | null,"paid_at": string | null,"provider": string,"raw": Json | null,"reference": string,"refund_of": string | null,"status": Database["public"]['Enums']["payment_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"booking_id": string,"created_at"?: string,"currency"?: string,"id"?: string,"kind": Database["public"]['Enums']["payment_kind"],"method"?: Database["public"]['Enums']["payment_method"] | null,"paid_at"?: string | null,"provider"?: string,"raw"?: Json | null,"reference": string,"refund_of"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number,"booking_id"?: string,"created_at"?: string,"currency"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["payment_kind"],"method"?: Database["public"]['Enums']["payment_method"] | null,"paid_at"?: string | null,"provider"?: string,"raw"?: Json | null,"reference"?: string,"refund_of"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_refund_of_fkey"
      columns: ["refund_of"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    }
                  ]
                },"pricing_rules": {
                  Row: {
                    "active": boolean,"base_price": number,"created_at": string,"extra_hour_rate": number,"extra_km_rate": number,"id": string,"included_hours": number,"included_km": number,"night_surcharge_pct": number,"trip_type": Database["public"]['Enums']["trip_type"],"updated_at": string,"vehicle_type_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"base_price": number,"created_at"?: string,"extra_hour_rate"?: number,"extra_km_rate"?: number,"id"?: string,"included_hours"?: number,"included_km"?: number,"night_surcharge_pct"?: number,"trip_type": Database["public"]['Enums']["trip_type"],"updated_at"?: string,"vehicle_type_id": string
                  }
                  Update: {
                    "active"?: boolean,"base_price"?: number,"created_at"?: string,"extra_hour_rate"?: number,"extra_km_rate"?: number,"id"?: string,"included_hours"?: number,"included_km"?: number,"night_surcharge_pct"?: number,"trip_type"?: Database["public"]['Enums']["trip_type"],"updated_at"?: string,"vehicle_type_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pricing_rules_vehicle_type_id_fkey"
      columns: ["vehicle_type_id"]
isOneToOne: false
      referencedRelation: "vehicle_types"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"company_id": string | null,"created_at": string,"email": string | null,"full_name": string | null,"id": string,"phone": string | null,"role": Database["public"]['Enums']["user_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"company_id"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id": string,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"company_id"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id"?: string,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"promo_codes": {
                  Row: {
                    "active": boolean,"code": string,"created_at": string,"id": string,"max_uses": number | null,"min_subtotal": number,"type": Database["public"]['Enums']["promo_type"],"updated_at": string,"used_count": number,"valid_from": string | null,"valid_to": string | null,"value": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"code": string,"created_at"?: string,"id"?: string,"max_uses"?: number | null,"min_subtotal"?: number,"type": Database["public"]['Enums']["promo_type"],"updated_at"?: string,"used_count"?: number,"valid_from"?: string | null,"valid_to"?: string | null,"value": number
                  }
                  Update: {
                    "active"?: boolean,"code"?: string,"created_at"?: string,"id"?: string,"max_uses"?: number | null,"min_subtotal"?: number,"type"?: Database["public"]['Enums']["promo_type"],"updated_at"?: string,"used_count"?: number,"valid_from"?: string | null,"valid_to"?: string | null,"value"?: number
                  }
                  Relationships: [
                    
                  ]
                },"reviews": {
                  Row: {
                    "booking_id": string,"comment": string | null,"created_at": string,"customer_id": string | null,"id": string,"is_published": boolean,"rating": number,"sentiment": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"comment"?: string | null,"created_at"?: string,"customer_id"?: string | null,"id"?: string,"is_published"?: boolean,"rating": number,"sentiment"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "booking_id"?: string,"comment"?: string | null,"created_at"?: string,"customer_id"?: string | null,"id"?: string,"is_published"?: boolean,"rating"?: number,"sentiment"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: true
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"trip_logs": {
                  Row: {
                    "booking_id": string,"created_at": string,"end_odometer": number | null,"ended_at": string | null,"extra_hours": number,"extra_km": number,"id": string,"notes": string | null,"start_odometer": number | null,"start_photo_path": string | null,"started_at": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"created_at"?: string,"end_odometer"?: number | null,"ended_at"?: string | null,"extra_hours"?: number,"extra_km"?: number,"id"?: string,"notes"?: string | null,"start_odometer"?: number | null,"start_photo_path"?: string | null,"started_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "booking_id"?: string,"created_at"?: string,"end_odometer"?: number | null,"ended_at"?: string | null,"extra_hours"?: number,"extra_km"?: number,"id"?: string,"notes"?: string | null,"start_odometer"?: number | null,"start_photo_path"?: string | null,"started_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "trip_logs_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: true
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"vehicle_types": {
                  Row: {
                    "category": string,"created_at": string,"description": string | null,"id": string,"luggage_capacity": number,"name": string,"seats": number,"slug": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"luggage_capacity"?: number,"name": string,"seats": number,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "category"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"luggage_capacity"?: number,"name"?: string,"seats"?: number,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"vehicles": {
                  Row: {
                    "colour": string | null,"created_at": string,"current_mileage": number,"features": (string)[],"id": string,"name": string,"photos": (string)[],"plate": string,"status": Database["public"]['Enums']["vehicle_status"],"type_id": string,"updated_at": string,"videos": (string)[],"year": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "colour"?: string | null,"created_at"?: string,"current_mileage"?: number,"features"?: (string)[],"id"?: string,"name": string,"photos"?: (string)[],"plate": string,"status"?: Database["public"]['Enums']["vehicle_status"],"type_id": string,"updated_at"?: string,"videos"?: (string)[],"year"?: number | null
                  }
                  Update: {
                    "colour"?: string | null,"created_at"?: string,"current_mileage"?: number,"features"?: (string)[],"id"?: string,"name"?: string,"photos"?: (string)[],"plate"?: string,"status"?: Database["public"]['Enums']["vehicle_status"],"type_id"?: string,"updated_at"?: string,"videos"?: (string)[],"year"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "vehicles_type_id_fkey"
      columns: ["type_id"]
isOneToOne: false
      referencedRelation: "vehicle_types"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["user_role"]
                           },
"booking_block_range":
{ Args: { "buffer_minutes": number,"end_at": string,"start_at": string }; Returns: unknown
                           },
"cancel_booking_group":
{ Args: { "p_lead": string,"p_reason": string }; Returns: number
                           },
"create_booking":
{ Args: { "p_addons": Json,"p_contact_email": string,"p_contact_name": string,"p_contact_phone": string,"p_customer_id": string,"p_destination_id": string,"p_distance_km": number,"p_dropoff": Json,"p_end_at": string,"p_hold_minutes"?: number,"p_luggage": number,"p_notes": string,"p_pickup": Json,"p_promo_code_id": string,"p_quote": Json,"p_source": Database["public"]['Enums']["booking_source"],"p_start_at": string,"p_stops": Json,"p_trip_type": Database["public"]['Enums']["trip_type"],"p_vans": Json }; Returns: {
              "booking_id": string,"group_id": string,"ref_code": string
            }[]
                           },
"current_company_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"current_driver_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"gen_booking_ref":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_my_assigned_driver":
{ Args: { "p_driver_id": string }; Returns: boolean
                           },
"record_payment_success":
{ Args: { "p_amount": number,"p_method": Database["public"]['Enums']["payment_method"],"p_paid_at": string,"p_raw": Json,"p_reference": string }; Returns: {
              "applied": boolean,"booking_id": string
            }[]
                           },
"release_expired_holds":
{ Args: Record<PropertyKey, never>; Returns: number
                           }
          }
          Enums: {
            "addon_unit": "per_trip"|"per_hour"|"per_day"|"per_item","booking_source": "web"|"whatsapp"|"admin"|"ai","booking_status": "pending_payment"|"confirmed"|"assigned"|"in_progress"|"completed"|"cancelled"|"refunded","conversation_channel": "web"|"whatsapp","conversation_status": "bot"|"human"|"closed","expense_category": "fuel"|"repair"|"other","message_role": "user"|"assistant"|"tool"|"staff","notification_channel": "whatsapp"|"sms"|"email","notification_status": "sent"|"failed"|"skipped","payment_kind": "deposit"|"balance"|"full"|"refund","payment_method": "momo"|"card"|"bank_transfer"|"cash","payment_status": "pending"|"success"|"failed"|"abandoned"|"reversed"|"refunded","promo_type": "percent"|"fixed","trip_type": "airport"|"half_day"|"full_day"|"multi_day"|"outstation"|"event"|"corporate_shuttle","user_role": "customer"|"corporate_admin"|"driver"|"admin","vehicle_status": "available"|"on_trip"|"maintenance"|"inactive"
          }
          CompositeTypes: {
            [_ in never]: never
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
            "addon_unit": ["per_trip", "per_hour", "per_day", "per_item"],"booking_source": ["web", "whatsapp", "admin", "ai"],"booking_status": ["pending_payment", "confirmed", "assigned", "in_progress", "completed", "cancelled", "refunded"],"conversation_channel": ["web", "whatsapp"],"conversation_status": ["bot", "human", "closed"],"expense_category": ["fuel", "repair", "other"],"message_role": ["user", "assistant", "tool", "staff"],"notification_channel": ["whatsapp", "sms", "email"],"notification_status": ["sent", "failed", "skipped"],"payment_kind": ["deposit", "balance", "full", "refund"],"payment_method": ["momo", "card", "bank_transfer", "cash"],"payment_status": ["pending", "success", "failed", "abandoned", "reversed", "refunded"],"promo_type": ["percent", "fixed"],"trip_type": ["airport", "half_day", "full_day", "multi_day", "outstation", "event", "corporate_shuttle"],"user_role": ["customer", "corporate_admin", "driver", "admin"],"vehicle_status": ["available", "on_trip", "maintenance", "inactive"]
          }
        }
} as const
