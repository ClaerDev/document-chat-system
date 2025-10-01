import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.text()
  // Parse webhook payload to validate format
  JSON.parse(payload)

  // Create a new Svix instance with your secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '')

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type

  try {
    switch (eventType) {
      case 'user.created':
        await handleUserCreated(evt.data)
        break
      case 'user.updated':
        await handleUserUpdated(evt.data)
        break
      case 'user.deleted':
        await handleUserDeleted(evt.data)
        break
      case 'organization.created':
        await handleOrganizationCreated(evt.data)
        break
      case 'organization.updated':
        await handleOrganizationUpdated(evt.data)
        break
      case 'organization.deleted':
        await handleOrganizationDeleted(evt.data)
        break
      case 'organizationMembership.created':
        await handleMembershipCreated(evt.data)
        break
      case 'organizationMembership.updated':
        await handleMembershipUpdated(evt.data)
        break
      case 'organizationMembership.deleted':
        await handleMembershipDeleted(evt.data)
        break
      default:
        console.log(`Unhandled webhook event: ${eventType}`)
    }

    return NextResponse.json({ message: 'Webhook processed successfully' })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response('Error processing webhook', {
      status: 500,
    })
  }
}

async function handleUserCreated(data: any) {
  console.log('User created:', data.id)
  
  // Find or create organization (for single-user organizations)
  let organizationId = null
  
  // Check if user belongs to any organizations
  if (data.organization_memberships?.length > 0) {
    const membership = data.organization_memberships[0]
    organizationId = membership.organization.id
    
    // Ensure organization exists in our database
    await db.organization.upsert({
      where: { id: organizationId },
      create: {
        id: organizationId,
        name: membership.organization.name || `${data.first_name} ${data.last_name}'s Organization`,
        slug: membership.organization.slug || `org-${organizationId.slice(0, 8)}`,
      },
      update: {
        name: membership.organization.name || `${data.first_name} ${data.last_name}'s Organization`,
      },
    })
  } else {
    // Create a personal organization for the user
    const organization = await db.organization.create({
      data: {
        name: `${data.first_name} ${data.last_name}'s Organization`,
        slug: `org-${data.id.slice(0, 8)}`,
      },
    })
    organizationId = organization.id
  }

  // Create the user in our database
  await db.user.create({
    data: {
      clerkId: data.id,
      email: data.email_addresses[0]?.email_address || '',
      firstName: data.first_name,
      lastName: data.last_name,
      imageUrl: data.image_url,
      organizationId: organizationId,
      role: 'OWNER', // First user in organization is owner
      lastActiveAt: new Date(),
    },
  })
}

async function handleUserUpdated(data: any) {
  console.log('User updated:', data.id)
  
  await db.user.update({
    where: { clerkId: data.id },
    data: {
      email: data.email_addresses[0]?.email_address || '',
      firstName: data.first_name,
      lastName: data.last_name,
      imageUrl: data.image_url,
      lastActiveAt: new Date(),
    },
  })
}

async function handleUserDeleted(data: any) {
  console.log('User deleted:', data.id)
  
  // Soft delete the user
  await db.user.update({
    where: { clerkId: data.id },
    data: {
      deletedAt: new Date(),
    },
  })
}

async function handleOrganizationCreated(data: any) {
  console.log('Organization created:', data.id)
  
  await db.organization.upsert({
    where: { id: data.id },
    create: {
      id: data.id,
      name: data.name,
      slug: data.slug,
    },
    update: {
      name: data.name,
      slug: data.slug,
    },
  })
}

async function handleOrganizationUpdated(data: any) {
  console.log('Organization updated:', data.id)
  
  await db.organization.update({
    where: { id: data.id },
    data: {
      name: data.name,
      slug: data.slug,
    },
  })
}

async function handleOrganizationDeleted(data: any) {
  console.log('Organization deleted:', data.id)
  
  // Soft delete the organization
  await db.organization.update({
    where: { id: data.id },
    data: {
      deletedAt: new Date(),
    },
  })
}

async function handleMembershipCreated(data: any) {
  console.log('Membership created:', data.id)
  
  // Update user's organization
  await db.user.update({
    where: { clerkId: data.public_user_data.user_id },
    data: {
      organizationId: data.organization.id,
      role: mapClerkRoleToUserRole(data.role),
    },
  })
}

async function handleMembershipUpdated(data: any) {
  console.log('Membership updated:', data.id)
  
  // Update user's role
  await db.user.update({
    where: { clerkId: data.public_user_data.user_id },
    data: {
      role: mapClerkRoleToUserRole(data.role),
    },
  })
}

async function handleMembershipDeleted(data: any) {
  console.log('Membership deleted:', data.id)
  
  // Remove user from organization (or soft delete if needed)
  // For now, we'll keep the user but mark them as inactive
  await db.user.update({
    where: { clerkId: data.public_user_data.user_id },
    data: {
      deletedAt: new Date(),
    },
  })
}

function mapClerkRoleToUserRole(clerkRole: string) {
  switch (clerkRole) {
    case 'admin':
      return 'ADMIN'
    case 'basic_member':
      return 'MEMBER'
    case 'viewer':
      return 'VIEWER'
    default:
      return 'MEMBER'
  }
}