export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          payload: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          payload?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          payload?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admins: {
        Row: {
          created_at: string
          email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          user_id?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          booking_intent_id: string | null
          calcom_booking_uid: string | null
          calcom_reservation_uid: string | null
          calendly_event_uri: string | null
          calendly_invitee_uri: string | null
          client_email: string
          client_name: string | null
          client_note: string | null
          client_user_id: string | null
          created_at: string
          currency: string | null
          ends_at: string
          hold_expires_at: string | null
          id: string
          manage_token: string | null
          meeting_url: string | null
          payment_status: string | null
          price_cents: number | null
          service_duration_minutes: number | null
          service_id: string | null
          service_name: string | null
          starts_at: string
          status: string
          stripe_payment_intent_id: string | null
          therapist_id: string
          updated_at: string
        }
        Insert: {
          booking_intent_id?: string | null
          calcom_booking_uid?: string | null
          calcom_reservation_uid?: string | null
          calendly_event_uri?: string | null
          calendly_invitee_uri?: string | null
          client_email: string
          client_name?: string | null
          client_note?: string | null
          client_user_id?: string | null
          created_at?: string
          currency?: string | null
          ends_at: string
          hold_expires_at?: string | null
          id?: string
          manage_token?: string | null
          meeting_url?: string | null
          payment_status?: string | null
          price_cents?: number | null
          service_duration_minutes?: number | null
          service_id?: string | null
          service_name?: string | null
          starts_at: string
          status?: string
          stripe_payment_intent_id?: string | null
          therapist_id: string
          updated_at?: string
        }
        Update: {
          booking_intent_id?: string | null
          calcom_booking_uid?: string | null
          calcom_reservation_uid?: string | null
          calendly_event_uri?: string | null
          calendly_invitee_uri?: string | null
          client_email?: string
          client_name?: string | null
          client_note?: string | null
          client_user_id?: string | null
          created_at?: string
          currency?: string | null
          ends_at?: string
          hold_expires_at?: string | null
          id?: string
          manage_token?: string | null
          meeting_url?: string | null
          payment_status?: string | null
          price_cents?: number | null
          service_duration_minutes?: number | null
          service_id?: string | null
          service_name?: string | null
          starts_at?: string
          status?: string
          stripe_payment_intent_id?: string | null
          therapist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_booking_intent_id_fkey"
            columns: ["booking_intent_id"]
            isOneToOne: false
            referencedRelation: "booking_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "therapist_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_intents: {
        Row: {
          booked_at: string | null
          calcom_booking_uid: string | null
          calcom_reservation_uid: string | null
          calendly_event_uri: string | null
          calendly_invitee_uri: string | null
          calendly_scheduled_at: string | null
          client_email: string
          client_name: string | null
          client_user_id: string | null
          created_at: string
          currency: string
          hold_expires_at: string | null
          id: string
          invite_link_id: string | null
          is_direct_invite: boolean
          needs_manual_review: boolean
          paid_at: string | null
          pending_ref: string | null
          platform_fee_cents: number
          price_cents: number
          refund_amount_cents: number | null
          refund_reason: string | null
          refunded_at: string | null
          service_duration_minutes: number | null
          service_id: string | null
          service_name: string | null
          slot_start: string | null
          status: string
          stripe_charge_id: string | null
          stripe_checkout_session_id: string | null
          stripe_environment: string
          stripe_payment_intent_id: string | null
          therapist_id: string
          updated_at: string
        }
        Insert: {
          booked_at?: string | null
          calcom_booking_uid?: string | null
          calcom_reservation_uid?: string | null
          calendly_event_uri?: string | null
          calendly_invitee_uri?: string | null
          calendly_scheduled_at?: string | null
          client_email: string
          client_name?: string | null
          client_user_id?: string | null
          created_at?: string
          currency?: string
          hold_expires_at?: string | null
          id?: string
          invite_link_id?: string | null
          is_direct_invite?: boolean
          needs_manual_review?: boolean
          paid_at?: string | null
          pending_ref?: string | null
          platform_fee_cents?: number
          price_cents: number
          refund_amount_cents?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          service_duration_minutes?: number | null
          service_id?: string | null
          service_name?: string | null
          slot_start?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_environment?: string
          stripe_payment_intent_id?: string | null
          therapist_id: string
          updated_at?: string
        }
        Update: {
          booked_at?: string | null
          calcom_booking_uid?: string | null
          calcom_reservation_uid?: string | null
          calendly_event_uri?: string | null
          calendly_invitee_uri?: string | null
          calendly_scheduled_at?: string | null
          client_email?: string
          client_name?: string | null
          client_user_id?: string | null
          created_at?: string
          currency?: string
          hold_expires_at?: string | null
          id?: string
          invite_link_id?: string | null
          is_direct_invite?: boolean
          needs_manual_review?: boolean
          paid_at?: string | null
          pending_ref?: string | null
          platform_fee_cents?: number
          price_cents?: number
          refund_amount_cents?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          service_duration_minutes?: number | null
          service_id?: string | null
          service_name?: string | null
          slot_start?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_environment?: string
          stripe_payment_intent_id?: string | null
          therapist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_intents_invite_link_fk"
            columns: ["invite_link_id"]
            isOneToOne: false
            referencedRelation: "therapist_invite_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_intents_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "therapist_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_intents_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calcom_connections: {
        Row: {
          auth_type: string
          calcom_access_token: string | null
          calcom_api_key: string | null
          calcom_email: string | null
          calcom_name: string | null
          calcom_refresh_token: string | null
          calcom_scopes: string | null
          calcom_token_expires_at: string | null
          calcom_user_id: number | null
          calcom_username: string
          connection_error: string | null
          connection_status: string
          created_at: string
          id: string
          last_checked_at: string | null
          therapist_id: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_type?: string
          calcom_access_token?: string | null
          calcom_api_key?: string | null
          calcom_email?: string | null
          calcom_name?: string | null
          calcom_refresh_token?: string | null
          calcom_scopes?: string | null
          calcom_token_expires_at?: string | null
          calcom_user_id?: number | null
          calcom_username: string
          connection_error?: string | null
          connection_status?: string
          created_at?: string
          id?: string
          last_checked_at?: string | null
          therapist_id: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_type?: string
          calcom_access_token?: string | null
          calcom_api_key?: string | null
          calcom_email?: string | null
          calcom_name?: string | null
          calcom_refresh_token?: string | null
          calcom_scopes?: string | null
          calcom_token_expires_at?: string | null
          calcom_user_id?: number | null
          calcom_username?: string
          connection_error?: string | null
          connection_status?: string
          created_at?: string
          id?: string
          last_checked_at?: string | null
          therapist_id?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calcom_connections_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: true
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendly_connections: {
        Row: {
          access_token: string
          calendly_email: string | null
          calendly_name: string | null
          calendly_organization_uri: string | null
          calendly_user_uri: string
          created_at: string
          id: string
          refresh_token: string
          scheduling_url: string | null
          therapist_id: string
          token_expires_at: string
          updated_at: string
          user_id: string
          webhook_subscription_uri: string | null
        }
        Insert: {
          access_token: string
          calendly_email?: string | null
          calendly_name?: string | null
          calendly_organization_uri?: string | null
          calendly_user_uri: string
          created_at?: string
          id?: string
          refresh_token: string
          scheduling_url?: string | null
          therapist_id: string
          token_expires_at: string
          updated_at?: string
          user_id: string
          webhook_subscription_uri?: string | null
        }
        Update: {
          access_token?: string
          calendly_email?: string | null
          calendly_name?: string | null
          calendly_organization_uri?: string | null
          calendly_user_uri?: string
          created_at?: string
          id?: string
          refresh_token?: string
          scheduling_url?: string | null
          therapist_id?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
          webhook_subscription_uri?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendly_connections_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: true
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      matching_enquiries: {
        Row: {
          consent_at: string
          consent_text: string
          created_at: string
          email: string
          help_with: string
          id: string
          preferred_age: string
          preferred_gender: string
          rate_key: string
        }
        Insert: {
          consent_at?: string
          consent_text: string
          created_at?: string
          email: string
          help_with: string
          id?: string
          preferred_age: string
          preferred_gender: string
          rate_key: string
        }
        Update: {
          consent_at?: string
          consent_text?: string
          created_at?: string
          email?: string
          help_with?: string
          id?: string
          preferred_age?: string
          preferred_gender?: string
          rate_key?: string
        }
        Relationships: []
      }
      partner_enquiries: {
        Row: {
          additional_info: string | null
          admin_notes: string | null
          audience_size: string | null
          consent_at: string
          consent_text: string
          contact_name: string
          created_at: string
          email: string
          id: string
          interests: string[]
          job_title: string | null
          organisation_name: string
          organisation_type: string
          rate_key: string
          source: Json
          status: string
          updated_at: string
        }
        Insert: {
          additional_info?: string | null
          admin_notes?: string | null
          audience_size?: string | null
          consent_at?: string
          consent_text: string
          contact_name: string
          created_at?: string
          email: string
          id?: string
          interests?: string[]
          job_title?: string | null
          organisation_name: string
          organisation_type: string
          rate_key: string
          source?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          additional_info?: string | null
          admin_notes?: string | null
          audience_size?: string | null
          consent_at?: string
          consent_text?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          interests?: string[]
          job_title?: string | null
          organisation_name?: string
          organisation_type?: string
          rate_key?: string
          source?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          booking_intent_id: string | null
          created_at: string
          environment: string
          event_type: string
          id: string
          payload: Json
          stripe_event_id: string
        }
        Insert: {
          booking_intent_id?: string | null
          created_at?: string
          environment: string
          event_type: string
          id?: string
          payload: Json
          stripe_event_id: string
        }
        Update: {
          booking_intent_id?: string | null
          created_at?: string
          environment?: string
          event_type?: string
          id?: string
          payload?: Json
          stripe_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_booking_intent_id_fkey"
            columns: ["booking_intent_id"]
            isOneToOne: false
            referencedRelation: "booking_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seo_pages: {
        Row: {
          areas: string[]
          body: string
          created_at: string
          faqs: Json
          h1: string
          id: string
          intro: string
          meta_description: string
          published: boolean
          related_slugs: string[]
          reviewed_on: string | null
          reviewer_name: string
          reviewer_qualifications: string
          seo_title: string
          slug: string
          status: string
          therapist_section_heading: string
          therapy_approaches: string[]
          updated_at: string
        }
        Insert: {
          areas?: string[]
          body?: string
          created_at?: string
          faqs?: Json
          h1: string
          id?: string
          intro?: string
          meta_description?: string
          published?: boolean
          related_slugs?: string[]
          reviewed_on?: string | null
          reviewer_name?: string
          reviewer_qualifications?: string
          seo_title: string
          slug: string
          status?: string
          therapist_section_heading?: string
          therapy_approaches?: string[]
          updated_at?: string
        }
        Update: {
          areas?: string[]
          body?: string
          created_at?: string
          faqs?: Json
          h1?: string
          id?: string
          intro?: string
          meta_description?: string
          published?: boolean
          related_slugs?: string[]
          reviewed_on?: string | null
          reviewer_name?: string
          reviewer_qualifications?: string
          seo_title?: string
          slug?: string
          status?: string
          therapist_section_heading?: string
          therapy_approaches?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      seo_redirects: {
        Row: {
          created_at: string
          from_slug: string
          to_slug: string
        }
        Insert: {
          created_at?: string
          from_slug: string
          to_slug: string
        }
        Update: {
          created_at?: string
          from_slug?: string
          to_slug?: string
        }
        Relationships: []
      }
      session_notes: {
        Row: {
          appointment_id: string | null
          body: string
          client_email: string
          client_user_id: string | null
          created_at: string
          id: string
          shared: boolean
          therapist_id: string
          title: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          body: string
          client_email: string
          client_user_id?: string | null
          created_at?: string
          id?: string
          shared?: boolean
          therapist_id: string
          title: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          body?: string
          client_email?: string
          client_user_id?: string | null
          created_at?: string
          id?: string
          shared?: boolean
          therapist_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      therapist_approval_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          therapist_profile_id: string
          token: string
          used_at: string | null
          used_by_ip: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          therapist_profile_id: string
          token: string
          used_at?: string | null
          used_by_ip?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          therapist_profile_id?: string
          token?: string
          used_at?: string | null
          used_by_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "therapist_approval_tokens_therapist_profile_id_fkey"
            columns: ["therapist_profile_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_bank_details: {
        Row: {
          account_name: string
          account_number: string
          bank_address: string | null
          bank_name: string | null
          created_at: string
          sort_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_address?: string | null
          bank_name?: string | null
          created_at?: string
          sort_code: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_address?: string | null
          bank_name?: string | null
          created_at?: string
          sort_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      therapist_clients: {
        Row: {
          client_email: string
          client_user_id: string | null
          created_at: string
          id: string
          linked_via: string
          therapist_id: string
        }
        Insert: {
          client_email: string
          client_user_id?: string | null
          created_at?: string
          id?: string
          linked_via?: string
          therapist_id: string
        }
        Update: {
          client_email?: string
          client_user_id?: string | null
          created_at?: string
          id?: string
          linked_via?: string
          therapist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapist_clients_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_interest: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          note: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      therapist_invite_links: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          label: string | null
          max_uses: number | null
          revoked_at: string | null
          therapist_id: string
          therapist_user_id: string
          token: string
          updated_at: string
          uses_count: number
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          label?: string | null
          max_uses?: number | null
          revoked_at?: string | null
          therapist_id: string
          therapist_user_id: string
          token: string
          updated_at?: string
          uses_count?: number
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          label?: string | null
          max_uses?: number | null
          revoked_at?: string | null
          therapist_id?: string
          therapist_user_id?: string
          token?: string
          updated_at?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "therapist_invite_links_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_profiles: {
        Row: {
          approach: string | null
          approved_at: string | null
          bio: string | null
          calcom_connected_at: string | null
          calcom_username: string | null
          calendly_connected_at: string | null
          calendly_url: string | null
          calendly_user_uri: string | null
          created_at: string
          display_name: string
          gender: string | null
          id: string
          insurance_providers: string[]
          intro_video_url: string | null
          languages: string[]
          location: string | null
          modalities: string[]
          offers_intro_call: boolean
          photo_url: string | null
          published: boolean
          published_at: string | null
          qualifications: string | null
          rejected_at: string | null
          rejection_reason: string | null
          session_currency: string
          session_duration_minutes: number
          session_fee_50: number | null
          session_fee_80: number | null
          session_price_cents: number | null
          slug: string
          specialties: string[]
          testimonials: Json
          title: string | null
          updated_at: string
          user_id: string
          years_in_practice: number | null
        }
        Insert: {
          approach?: string | null
          approved_at?: string | null
          bio?: string | null
          calcom_connected_at?: string | null
          calcom_username?: string | null
          calendly_connected_at?: string | null
          calendly_url?: string | null
          calendly_user_uri?: string | null
          created_at?: string
          display_name: string
          gender?: string | null
          id?: string
          insurance_providers?: string[]
          intro_video_url?: string | null
          languages?: string[]
          location?: string | null
          modalities?: string[]
          offers_intro_call?: boolean
          photo_url?: string | null
          published?: boolean
          published_at?: string | null
          qualifications?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          session_currency?: string
          session_duration_minutes?: number
          session_fee_50?: number | null
          session_fee_80?: number | null
          session_price_cents?: number | null
          slug: string
          specialties?: string[]
          testimonials?: Json
          title?: string | null
          updated_at?: string
          user_id: string
          years_in_practice?: number | null
        }
        Update: {
          approach?: string | null
          approved_at?: string | null
          bio?: string | null
          calcom_connected_at?: string | null
          calcom_username?: string | null
          calendly_connected_at?: string | null
          calendly_url?: string | null
          calendly_user_uri?: string | null
          created_at?: string
          display_name?: string
          gender?: string | null
          id?: string
          insurance_providers?: string[]
          intro_video_url?: string | null
          languages?: string[]
          location?: string | null
          modalities?: string[]
          offers_intro_call?: boolean
          photo_url?: string | null
          published?: boolean
          published_at?: string | null
          qualifications?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          session_currency?: string
          session_duration_minutes?: number
          session_fee_50?: number | null
          session_fee_80?: number | null
          session_price_cents?: number | null
          slug?: string
          specialties?: string[]
          testimonials?: Json
          title?: string | null
          updated_at?: string
          user_id?: string
          years_in_practice?: number | null
        }
        Relationships: []
      }
      therapist_reviews: {
        Row: {
          body: string | null
          client_user_id: string
          created_at: string
          id: string
          rating: number
          therapist_id: string
          traits: string[]
          updated_at: string
        }
        Insert: {
          body?: string | null
          client_user_id: string
          created_at?: string
          id?: string
          rating: number
          therapist_id: string
          traits?: string[]
          updated_at?: string
        }
        Update: {
          body?: string | null
          client_user_id?: string
          created_at?: string
          id?: string
          rating?: number
          therapist_id?: string
          traits?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapist_reviews_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_services: {
        Row: {
          active: boolean
          calcom_event_type_id: number | null
          calcom_event_type_slug: string | null
          created_at: string
          currency: string
          description: string | null
          duration_minutes: number
          id: string
          name: string
          price_cents: number
          sort_order: number
          therapist_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          calcom_event_type_id?: number | null
          calcom_event_type_slug?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes: number
          id?: string
          name: string
          price_cents: number
          sort_order?: number
          therapist_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          calcom_event_type_id?: number | null
          calcom_event_type_slug?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          price_cents?: number
          sort_order?: number
          therapist_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapist_services_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      submit_matching_enquiry: {
        Args: {
          p_age: string
          p_consent: string
          p_email: string
          p_gender: string
          p_help: string
          p_rate_key: string
        }
        Returns: string
      }
      submit_partner_enquiry: {
        Args: {
          p_consent: string
          p_contact: string
          p_email: string
          p_info: string
          p_interests: string[]
          p_job: string
          p_org: string
          p_rate_key: string
          p_size: string
          p_source: Json
          p_type: string
        }
        Returns: string
      }
      validate_invite_token: {
        Args: { _token: string }
        Returns: {
          reason: string
          therapist_display_name: string
          therapist_id: string
          therapist_slug: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "client" | "therapist" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["client", "therapist", "admin"],
    },
  },
} as const
