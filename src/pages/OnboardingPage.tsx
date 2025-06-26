import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { FlexibleDateInput } from '../components/ui/FlexibleDateInput'
import { MarketingConsentCheckbox } from '../components/MarketingConsentCheckbox'
import { Users, Plus, Trash2, CheckCircle, ArrowRight } from 'lucide-react'

interface FamilyMember {
  name: string
  nickname?: string
  relationship: string
  birthday?: string
  anniversary?: string
  address?: string
}

const relationshipOptions = [
  { value: '', label: 'Select One' },
  { value: 'Father', label: 'Father' },
  { value: 'Mother', label: 'Mother' },
  { value: 'Son', label: 'Son' },
  { value: 'Daughter', label: 'Daughter' },
  { value: 'Grandpa', label: 'Grandpa' },
  { value: 'Grandma', label: 'Grandma' },
  { value: 'Uncle', label: 'Uncle' },
  { value: 'Aunt', label: 'Aunt' },
  { value: 'Cousin', label: 'Cousin' },
  { value: 'Caregiver', label: 'Caregiver' },
  { value: 'Pet Sitter', label: 'Pet Sitter' },
  { value: 'Babysitter', label: 'Babysitter' },
  { value: 'Dog', label: 'Dog' },
  { value: 'Cat', label: 'Cat' },
  { value: 'Other', label: 'Other' },
]

export const OnboardingPage = () => {
  const { user, userProfile, refreshProfile } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [familyName, setFamilyName] = useState('')
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [members, setMembers] = useState<FamilyMember[]>([
    { name: '', nickname: '', relationship: '' }
  ])

  console.log('🎯 OnboardingPage rendering - User:', user?.id, 'Profile:', userProfile?.id, 'Family ID:', userProfile?.family_id)

  // CRITICAL: If user has family, redirect to dashboard immediately
  useEffect(() => {
    if (userProfile?.family_id) {
      console.log('✅ User already has family, should redirect to dashboard')
    }
  }, [userProfile])

  // This redirect is now handled by ProtectedRoute, but keeping as backup
  if (userProfile?.family_id) {
    console.log('🔄 User has family_id, redirecting to dashboard')
    return <Navigate to="/dashboard" replace />
  }

  const getCategoryFromRelationship = (relationship: string) => {
    const immediateFamilyRelationships = ['Father', 'Mother', 'Son', 'Daughter']
    const extendedFamilyRelationships = ['Grandpa', 'Grandma', 'Uncle', 'Aunt', 'Cousin']
    const petRelationships = ['Dog', 'Cat']
    
    if (immediateFamilyRelationships.includes(relationship)) {
      return 'immediate_family'
    } else if (extendedFamilyRelationships.includes(relationship)) {
      return 'extended_family'
    } else if (petRelationships.includes(relationship)) {
      return 'pet'
    } else {
      return 'caregiver'
    }
  }

  const addMember = () => {
    setMembers([...members, { name: '', nickname: '', relationship: '' }])
  }

  const removeMember = (index: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index))
    }
  }

  const updateMember = (index: number, field: keyof FamilyMember, value: string) => {
    const updatedMembers = [...members]
    updatedMembers[index] = { ...updatedMembers[index], [field]: value }
    setMembers(updatedMembers)
  }

  const handleFamilySetup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!familyName.trim()) return

    setLoading(true)

    try {
      console.log('🏠 Creating family:', familyName)
      
      // Create family
      const { data: family, error: familyError } = await supabase
        .from('families')
        .insert({
          family_name: familyName,
          admin_user_id: user!.id,
        })
        .select()
        .single()

      if (familyError) throw familyError

      console.log('✅ Family created:', family)

      // Update user with family_id and admin role
      const { error: userError } = await supabase
        .from('users')
        .update({
          family_id: family.id,
          role: 'admin',
        })
        .eq('id', user!.id)

      if (userError) throw userError

      console.log('✅ User updated with family_id and admin role')

      // CRITICAL: Refresh profile to get the updated family_id
      await refreshProfile()
      setStep(2)
    } catch (error) {
      console.error('❌ Error creating family:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMembersSetup = async (e: React.FormEvent) => {
    e.preventDefault()

    const validMembers = members.filter(member => member.name.trim() && member.relationship)
    if (validMembers.length === 0) return

    setLoading(true)

    try {
      console.log('👥 Adding family members:', validMembers.length)
      
      // CRITICAL: Use the current userProfile.family_id
      if (!userProfile?.family_id) {
        throw new Error('No family_id found in user profile')
      }
      
      const membersToInsert = validMembers.map(member => ({
        family_id: userProfile.family_id,
        name: member.name,
        nickname: member.nickname || null,
        relationship: member.relationship,
        category: getCategoryFromRelationship(member.relationship),
        role: 'member', // New members start as regular members
        birthday: member.birthday || null, // Store as text directly
        anniversary: member.anniversary || null, // Store as text directly
        address: member.address || null,
      }))

      console.log('👥 Members to insert:', membersToInsert)

      const { error } = await supabase
        .from('family_members')
        .insert(membersToInsert)

      if (error) throw error

      console.log('✅ Family members added')
      
      // Update marketing consent if user opted in
      if (marketingConsent) {
        try {
          // Get client IP for audit trail
          const ipResponse = await fetch('https://api.ipify.org?format=json')
          const ipData = await ipResponse.json()
          const ipAddress = ipData.ip
          
          // Call the RPC function to update consent with audit trail
          await supabase.rpc('update_marketing_consent', {
            p_user_id: user!.id,
            p_consent: true,
            p_source: 'onboarding',
            p_ip_address: ipAddress,
            p_user_agent: navigator.userAgent
          })
          
          console.log('✅ Marketing consent recorded')
        } catch (consentError) {
          console.error('❌ Error recording marketing consent:', consentError)
          // Don't fail the onboarding process if consent recording fails
        }
      }
      
      // Mark onboarding as complete
      const { error: updateError } = await supabase
        .from('users')
        .update({ onboarding_complete: true })
        .eq('id', user!.id)
        
      if (updateError) {
        console.error('❌ Error marking onboarding complete:', updateError)
        // Don't fail the process for this
      }
      
      // Navigate to dashboard - user has now completed onboarding
      window.location.href = '/dashboard'
    } catch (error) {
      console.error('❌ Error adding family members:', error)
    } finally {
      setLoading(false)
    }
  }

  console.log('🎯 OnboardingPage rendering step:', step)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Family Scheduler</span>
            </div>
            
            <div className="text-sm text-gray-500">
              Step {step} of 2
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center p-4 py-12">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-blue-600 rounded-xl">
                <Users className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Set Up Your Family</h1>
            <p className="mt-2 text-gray-600">
              Let's get your family organized and ready to schedule together
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Progress Indicator */}
            <div className="mb-8">
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {step > 1 ? <CheckCircle className="h-5 w-5" /> : '1'}
                </div>
                <div className={`flex-1 h-0.5 mx-4 ${
                  step >= 2 ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  2
                </div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-sm text-gray-600">Family Name</span>
                <span className="text-sm text-gray-600">Add Members</span>
              </div>
            </div>

            {step === 1 && (
              <form onSubmit={handleFamilySetup} className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    What's your family name?
                  </h2>
                  <p className="text-gray-600 mb-4">
                    This will be displayed throughout the app and help identify your family.
                  </p>
                  <Input
                    label="Family Name"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder="The Smith Family"
                    required
                  />
                </div>

                {/* Marketing Consent Checkbox */}
                <div className="pt-4 border-t border-gray-200">
                  <MarketingConsentCheckbox
                    checked={marketingConsent}
                    onChange={setMarketingConsent}
                    source="onboarding"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  loading={loading}
                  disabled={!familyName.trim()}
                >
                  Continue to Add Members
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleMembersSetup} className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Add Family Members
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Add all the people (and pets!) in your family. You can always add more later.
                  </p>
                </div>

                <div className="space-y-4">
                  {members.map((member, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-900">
                          Member {index + 1}
                        </h3>
                        {members.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMember(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Name *"
                          value={member.name}
                          onChange={(e) => updateMember(index, 'name', e.target.value)}
                          placeholder="Enter name"
                          required
                        />

                        <Input
                          label="Nickname"
                          value={member.nickname || ''}
                          onChange={(e) => updateMember(index, 'nickname', e.target.value)}
                          placeholder="Enter nickname (optional)"
                        />

                        <Select
                          label="Relationship *"
                          value={member.relationship}
                          onChange={(e) => updateMember(index, 'relationship', e.target.value)}
                          options={relationshipOptions}
                          required
                        />

                        <div></div>

                        <FlexibleDateInput
                          label="Birthday"
                          value={member.birthday || ''}
                          onChange={(value) => updateMember(index, 'birthday', value)}
                          placeholder="MM/DD or MM/DD/YYYY"
                        />

                        <FlexibleDateInput
                          label="Anniversary"
                          value={member.anniversary || ''}
                          onChange={(value) => updateMember(index, 'anniversary', value)}
                          placeholder="MM/DD or MM/DD/YYYY"
                        />

                        <div className="md:col-span-2">
                          <Input
                            label="Address"
                            value={member.address || ''}
                            onChange={(e) => updateMember(index, 'address', e.target.value)}
                            placeholder="123 Main St, City, State 12345"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addMember}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Member
                  </Button>
                </div>

                <div className="flex space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    size="lg"
                    loading={loading}
                  >
                    Complete Setup
                    <CheckCircle className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}