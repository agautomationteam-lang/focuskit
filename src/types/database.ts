export type SubscriptionStatus = 'trial' | 'active' | 'inactive'
export type ReviewStatus = 'pending' | 'approved' | 'posted'
export type ResponseStatus = 'draft' | 'approved' | 'posted'
export type SelectedDraft = 'professional' | 'friendly' | 'custom'

export interface User {
  id: string
  email: string
  subscription_status: SubscriptionStatus
  trial_ends_at: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
  updated_at: string
}

export type BusinessTone = 'casual' | 'friendly' | 'luxury' | 'professional'

export interface Business {
  id: string
  user_id: string
  name: string
  google_place_id: string | null
  google_location_id: string | null
  google_access_token: string | null
  google_refresh_token: string | null
  google_account_id: string | null
  last_synced_at: string | null
  tone: BusinessTone
  auto_reply_enabled: boolean
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  business_id: string
  google_review_id: string | null
  reviewer_name: string
  reviewer_photo_url: string | null
  rating: number
  text: string | null
  review_date: string
  status: ReviewStatus
  synced_at: string | null
  replied_at: string | null
  reply_text: string | null
  created_at: string
  updated_at: string
}

export interface Response {
  id: string
  review_id: string
  draft_professional: string
  draft_friendly: string
  selected_draft: SelectedDraft | null
  final_text: string | null
  status: ResponseStatus
  posted_at: string | null
  created_at: string
  updated_at: string
}

export interface ReviewWithResponse extends Review {
  responses: Response | null
}
