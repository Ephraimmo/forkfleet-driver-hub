# ForkFleet Driver Hub

FORKFLEET DRIVER APP

Complete Production-Ready Driver & Delivery Management Application

Lovable One-Time Master Build Prompt

1. PROJECT OBJECTIVE

Build the complete ForkFleet Driver App as the third component of the ForkFleet food ordering and delivery ecosystem.

The ForkFleet ecosystem consists of:

Customer App

Management / Operations Console

Driver App

The Customer App allows customers to discover restaurants, order food, pay, and track deliveries.

The Management Console manages restaurants, branches, menus, customers, orders, drivers, dispatching, payments, promotions, support, reporting, and system configuration.

The Driver App is responsible for:

Driver authentication

Driver onboarding

Driver profile

Driver verification

Driver availability

Restaurant/branch authorization

Receiving delivery assignments

Accepting/rejecting assignments

Restaurant pickup

Order verification

Customer delivery

GPS tracking

Navigation

Delivery status updates

Proof of delivery

Earnings

Delivery history

Notifications

Driver support

Real-time communication with the Management Console and Customer App

Do NOT rebuild the Customer App.

Do NOT rebuild the Management Console.

The Driver App must connect to the same Firebase project and Firebase Realtime Database used by the existing ForkFleet ecosystem.

Firebase is the shared source of truth.

2. CRITICAL EXISTING SYSTEM REQUIREMENT

The Driver App must integrate with the existing ForkFleet Firebase structure.

Do NOT create a new Firebase project.

Do NOT create a second driver database.

Do NOT create duplicate restaurant, branch, menu, customer, or order records.

Before writing code:

Inspect the existing Firebase structure.

Discover existing nodes.

Discover existing fields.

Discover existing driver records.

Discover existing restaurant records.

Discover existing branch records.

Discover existing order records.

Discover existing driver assignments.

Preserve existing IDs.

Preserve existing field names.

Preserve existing relationships.

Reuse the existing Firebase data model wherever possible.

Never invent a new schema when an existing schema already exists.

3. EXISTING DRIVER DATA

The existing Firebase database contains driver profiles under:

/drivers/{driverId}


The system already contains existing driver IDs.

The Driver App must authenticate a driver and associate the authenticated account with the correct existing driver profile.

Do not create duplicate driver profiles.

Driver identity must be based on the existing driver ID.

4. DRIVER ASSIGNMENT ARCHITECTURE

This is one of the most important parts of the application.

A driver is NOT necessarily assigned to only one restaurant.

A driver may work for:

Multiple restaurants

Multiple branches of the same restaurant

Different branches across multiple restaurants

Example:

Driver:

drv-001


May be authorized for:

Restaurant A
  Branch 1
  Branch 2

Restaurant B
  Branch 1

Restaurant C
  Branch 4
  Branch 5


The application must support this relationship natively.

5. DRIVER ASSIGNMENT DATA MODEL

Use the existing assignment model:

/driverAssignments


Each assignment must represent:

driverId
restaurantId
branchId


Assignment keys must follow:

{driverId}__{restaurantId}__{branchId}


Example:

drv-001__rst-restaurantA__brn-branch1


Every assignment must be unique.

Never create duplicate assignment tuples.

6. ALL BRANCHES

If Management selects:

All Branches


DO NOT store:

branchId = "all"


DO NOT store:

branchId = "*"


Instead, resolve every actual branch belonging to that restaurant.

For example:

Restaurant:

Burger Lab


Branches:

main
Branch Test1


Selecting:

Burger Lab → All Branches


must create two concrete assignments:

driver__burgerlab__main
driver__burgerlab__branch-test1


The Driver App must understand these as two separate authorized delivery locations.

7. ASSIGNMENT HISTORY

Assignments must never be hard-deleted when a driver is removed from a restaurant or branch.

Instead:

is_active = false


must preserve historical assignment information.

This allows the system to determine:

Where the driver currently works

Where the driver previously worked

Assignment history

Audit information

Do not destroy assignment history.

The existing validation confirms that removal changes is_active to false instead of deleting history.

8. DRIVER ELIGIBILITY

This is a CRITICAL BUSINESS RULE.

A driver may only receive or accept an order if:

driver.restaurantId == order.restaurantId
AND
driver.branchId == order.branchId
AND
driver assignment is_active == true


The system must validate the exact restaurant AND exact branch.

Never authorize a driver based only on:

restaurantId


Branch authorization is mandatory.

9. ASSIGNMENT GUARD

Before assigning an order to a driver, execute an authoritative eligibility check.

Pseudo-logic:

isDriverEligible(driverId, restaurantId, branchId)


must verify:

driver exists

AND

assignment exists

AND

assignment.driverId == driverId

AND

assignment.restaurantId == restaurantId

AND

assignment.branchId == branchId

AND

assignment.is_active == true


If validation fails:

Reject the assignment.

Display:

This driver is not authorized for the order's restaurant and branch.


Never allow the Driver App to bypass this validation.

10. ORDER ASSIGNMENT

The Management Console / Dispatch system may assign a delivery to a driver.

The Driver App must receive the assignment in realtime.

Example:

Order:
FF-033291

Restaurant:
Burger Lab

Branch:
Branch Test1

Driver:
drv-001


The driver should receive:

New Delivery Available


with:

Restaurant

Branch

Order number

Pickup address

Customer delivery area

Estimated distance

Estimated earnings

Number of items

Special instructions

Requested pickup time

Delivery deadline

11. DRIVER ASSIGNMENT STATUS

Support:

pending
offered
accepted
rejected
assigned
arrived_at_restaurant
picked_up
en_route
arrived_at_customer
delivered
cancelled
failed


Maintain a complete status timeline.

Every status transition must contain:

status
timestamp
driverId
orderId
location
optional note


12. DRIVER APPLICATION SCREENS

Build the application in the following order.

1. Splash Screen

Display:

ForkFleet logo

Loading state

Firebase connection check

Authentication check

13. DRIVER AUTHENTICATION

Implement:

Login

Logout

Forgot Password

Reset Password

Email Verification

Phone Verification

OTP

Session Persistence

Device Management

Optional biometric login

The authenticated driver must be linked to the existing Firebase driver profile.

14. DRIVER ONBOARDING

Display:

Driver Name

Profile Photo

Phone

Email

Vehicle

License

Identity Documents

Verification Status

Assigned Restaurants

Assigned Branches

Bank / payout information

Emergency Contact

Required documents

If verification is incomplete:

Clearly show what is missing.

15. DRIVER HOME DASHBOARD

The Driver Home screen must show:

Current Status:

ONLINE
OFFLINE
BUSY


Today's:

Deliveries

Completed Orders

Earnings

Distance Travelled

Acceptance Rate

Completion Rate

Rating

Also show:

Current Delivery

Available Deliveries

Upcoming Deliveries

Notifications

Quick Navigation

16. ONLINE / OFFLINE STATUS

Drivers must be able to toggle:

Go Online
Go Offline


When offline:

Do not offer new deliveries.

When online:

The driver becomes eligible for new assignments subject to restaurant/branch authorization.

Store:

is_online
last_online_at
last_offline_at
last_location


17. DRIVER AVAILABILITY

The system must consider:

Online status

Current delivery

Driver assignment

Restaurant authorization

Branch authorization

Driver location

Delivery capacity

Driver account status

Driver suspension

Vehicle status

before offering an order.

18. AVAILABLE DELIVERY SCREEN

Display deliveries available to the driver.

Each card should contain:

Order Number

Restaurant

Branch

Pickup Distance

Delivery Distance

Estimated Total Distance

Estimated Earnings

Estimated Delivery Time

Customer Area

Number of Items

Special Instructions

Offer Expiration

Accept

Reject

Only display orders for restaurants and branches where the driver has an active assignment.

19. NEW DELIVERY NOTIFICATION

When a new delivery is assigned:

Display an immediate realtime notification.

Include:

New Delivery

Restaurant: Burger Lab
Branch: Branch Test1
Order: FF-033291
Pickup: 2.4 km
Delivery: 5.8 km
Estimated Earnings: RXX


Buttons:

Accept
Reject
View Details


20. ACCEPT DELIVERY

When the driver accepts:

Update the delivery assignment.

Set:

status = accepted


Then:

driver_id = authenticated driver


and maintain:

accepted_at


The Management Console must immediately see the update.

The Customer App must eventually receive the corresponding delivery status.

21. REJECT DELIVERY

Allow the driver to reject a delivery.

Optional rejection reasons:

Too far

Vehicle problem

Restaurant unavailable

Customer issue

Personal emergency

Other

Record:

rejected_at
rejection_reason
driver_id
order_id


The order must return to dispatch for reassignment where appropriate.

22. RESTAURANT PICKUP

Once a delivery is accepted:

Show:

Restaurant

Branch

Restaurant Address

Map

Navigation

Contact Restaurant

Order Number

Pickup Instructions

Special Instructions

Estimated Arrival

23. ARRIVE AT RESTAURANT

Driver selects:

I've Arrived


Record:

arrived_at_restaurant
timestamp
latitude
longitude


Notify Management.

Update order timeline.

24. ORDER VERIFICATION

Before pickup, allow the driver to verify:

Order Number

Pickup Code

QR Code

Restaurant

Branch

Number of Bags

Items

Special Instructions

Optional confirmation PIN.

Never allow a driver to pick up an order belonging to another restaurant/branch.

25. PICK UP ORDER

Driver selects:

Picked Up


Record:

picked_up_at
latitude
longitude
driver_id


Update order:

status = en_route


Notify:

Management

Customer

Restaurant

26. CUSTOMER DELIVERY

Show:

Customer Name

Delivery Address

Map

Navigation

Phone / Call

Message

Delivery Instructions

Order Summary

Delivery Code / PIN

27. ARRIVE AT CUSTOMER

Driver selects:

I've Arrived


Record:

arrived_at_customer
timestamp
latitude
longitude


Notify customer.

28. PROOF OF DELIVERY

Support:

Delivery PIN

Signature

Photo

QR Code

Customer confirmation

The configured proof-of-delivery method must be enforced.

Store proof securely.

Never expose private customer information unnecessarily.

29. COMPLETE DELIVERY

When delivery is successfully completed:

Set:

status = delivered


Record:

delivered_at


Also store:

driver_id
latitude
longitude
proof_of_delivery


The Management Console and Customer App must immediately receive the updated status.

30. LIVE DRIVER LOCATION

This is a critical realtime requirement.

The Driver App must continuously publish location while the driver is:

ONLINE
OR
ON AN ACTIVE DELIVERY


Write live location to:

/drivers/live/{orderId}


with:

latitude
longitude
heading
speed
updated_at


The Customer App already expects this structure for live driver tracking.

Do not simulate GPS coordinates.

Use the actual device geolocation API.

31. LOCATION UPDATE OPTIMIZATION

Do not continuously write GPS data unnecessarily.

Use intelligent intervals based on:

Driver movement

Order status

Distance travelled

Battery

Network availability

Example:

Online but idle:

Lower frequency

Active delivery:

Higher frequency

Approaching customer:

Higher precision

Always stop active-delivery tracking after completion.

32. NAVIGATION

Support:

Current Location

Restaurant Location

Customer Location

Route

Distance

ETA

Turn-by-turn navigation integration

Open external navigation app where appropriate.

Use a map-provider abstraction so the system can support:

Google Maps

MapLibre

Leaflet

Other providers

33. DRIVER EARNINGS

Display:

Today's Earnings

Weekly Earnings

Monthly Earnings

Per Delivery

Tips

Bonuses

Promotions

Adjustments

Pending Earnings

Paid Earnings

Refunds / deductions

Settlement History

34. DRIVER WALLET

Provide:

Balance

Transactions

Credits

Debits

Bonuses

Tips

Withdrawals

Settlement history

Every financial transaction must have:

transaction_id
driver_id
order_id
amount
type
status
created_at


35. DELIVERY HISTORY

Display:

Completed Deliveries

Cancelled Deliveries

Rejected Deliveries

Failed Deliveries

Filter by:

Date

Restaurant

Branch

Status

Earnings

Search by Order Number.

36. DRIVER PERFORMANCE

Display:

Total Deliveries

Completed Deliveries

Cancelled Deliveries

Acceptance Rate

Completion Rate

Average Pickup Time

Average Delivery Time

Distance

Customer Rating

Restaurant Rating

On-Time Rate

Earnings

37. RATINGS

Allow driver to view:

Customer Rating

Restaurant Rating

Average Rating

Rating History

Do not allow drivers to manipulate ratings.

38. NOTIFICATIONS

Implement:

Push Notifications

In-App Notifications

Order Assignment

Order Cancellation

Order Changes

Restaurant Messages

Customer Messages

Support Messages

Payment Notifications

Earnings Notifications

System Notifications

39. DRIVER SUPPORT

Implement:

Help Centre

FAQ

Support Tickets

Live Chat

Call Support

Delivery Issue

Restaurant Issue

Customer Issue

Payment Issue

Technical Issue

Emergency Contact

Each support conversation must be persisted in Firebase.

40. DRIVER / CUSTOMER COMMUNICATION

Allow controlled communication:

Driver ↔ Customer

Driver ↔ Restaurant

Driver ↔ Support

Do not expose unnecessary personal information.

Use masked phone communication where possible.

Persist chat messages.

41. DRIVER PROFILE

Allow the driver to view/edit permitted fields:

Name

Phone

Email

Photo

Vehicle

Vehicle Registration

Vehicle Type

License

Documents

Emergency Contact

Preferred Language

Notification Preferences

Payment Information

42. MULTI-RESTAURANT DRIVER SUPPORT

This is mandatory.

The same driver may work for:

Restaurant A → Branch 1
Restaurant A → Branch 2
Restaurant B → Branch 1
Restaurant C → Branch 3


The Driver App must never assume:

one driver = one restaurant


Instead:

one driver
    ↓
many restaurant assignments
    ↓
many branch assignments


43. BRANCH-SPECIFIC ORDER ELIGIBILITY

If an order belongs to:

Restaurant A
Branch 2


and the driver only has:

Restaurant A
Branch 1


the driver must NOT receive the order.

Even though the restaurant matches.

Exact branch matching is mandatory.

The existing validation specifically confirmed that exact branch eligibility is applied consistently across Driver Management, Orders, Dispatch, and the assignment mutation guard.

44. DRIVER ASSIGNMENT SECURITY

The Driver App must never trust client-side eligibility alone.

Every important operation must be validated server-side / through secured Firebase rules or Cloud Functions.

Especially:

Accept Order

Assign Order

Pickup Order

Complete Delivery

Change Status

Update Driver Location

Update Earnings

Create Proof of Delivery

45. FIREBASE DATABASE INTEGRATION

Use the existing Firebase project.

Customer data remains under customer-scoped paths.

Restaurant and menu data remain managed by the Operations Console.

Driver data remains under:

/drivers


Assignments:

/driverAssignments


Live tracking:

/drivers/live/{orderId}


Orders:

/orders/{orderId}


Notifications:

/notifications


Support:

/support


Use the existing database paths whenever they already exist.

Do not rename existing fields.

46. ORDER DATA RECONSTRUCTION

An order may contain references to:

customer_id
restaurant_id
branch_id
driver_id
payment_id


The Driver App must reconstruct the complete delivery view.

Join:

Order

Customer

Restaurant

Branch

Driver

Order Items

Payment Status

Delivery Address

Timeline

Tracking

Support

Proof of Delivery

Do not display incomplete raw Firebase objects.

Create a normalized internal:

DriverOrderViewModel


47. ORDER LOGGING

Every driver delivery event must be logged.

Examples:

order_received
assignment_offered
assignment_accepted
assignment_rejected
arrived_at_restaurant
pickup_verified
order_picked_up
en_route
arrived_at_customer
delivery_verified
proof_uploaded
delivered
cancelled
failed


Every event must include:

event_id
order_id
driver_id
restaurant_id
branch_id
event_type
timestamp
latitude
longitude
metadata


48. ORDER TIMELINE

Maintain an immutable timeline.

Example:

10:15 Order Accepted
10:20 Food Preparing
10:35 Food Ready
10:37 Driver Assigned
10:44 Driver Arrived at Restaurant
10:48 Order Picked Up
10:49 Driver En Route
11:02 Driver Arrived
11:05 Delivered


Never overwrite historical events.

Append new events.

49. REALTIME ARCHITECTURE

Use Firebase realtime subscriptions for:

New Assignments

Order Status

Driver Profile

Driver Assignment Changes

Restaurant Changes

Branch Changes

Notifications

Support Messages

Earnings

Wallet

Live Delivery

Clean up listeners when leaving screens.

Never create duplicate subscriptions.

50. OFFLINE MODE

The Driver App must handle poor network connectivity.

Cache:

Current Delivery

Restaurant Details

Customer Delivery Address

Navigation Data

Driver Profile

Assignment Data

Recent Orders

When offline:

Show:

You're offline


Queue safe status updates where appropriate.

Synchronize when connectivity returns.

Never duplicate an order event during reconnect.

Use idempotency keys for important mutations.

51. IDEMPOTENCY

Every important delivery mutation must have an idempotency key.

For example:

orderId + driverId + eventType + clientRequestId


If the same request is sent twice:

Do not create duplicate events.

Do not duplicate payments.

Do not duplicate delivery completion.

Do not duplicate earnings.

52. FIREBASE SECURITY

Use strict Firebase Security Rules.

Drivers must only be able to access:

Their own profile

Their own assignments

Orders assigned to them

Orders they are authorized to service

Required restaurant/branch information

Required customer delivery information

Their own earnings

Their own wallet

Their own notifications

Their own support conversations

Drivers must NOT access:

Other drivers' private information

Admin configuration

Other customers' orders

Restaurant financial information

Platform financial information

Other drivers' earnings

Unassigned private orders

53. ADMIN / MANAGEMENT INTEGRATION

The Driver App must work with the existing Management Console.

When Management:

Creates driver

Edits driver

Suspends driver

Assigns restaurant

Assigns branch

Removes assignment

Assigns order

Cancels order

Changes order status

Updates restaurant

the Driver App must reflect changes realtime where appropriate.

The validation report confirms the Management Console currently persists driver profiles and assignment records in Firebase and correctly filters driver eligibility by restaurant and branch.

54. CUSTOMER APP INTEGRATION

The Driver App must work with the existing Customer App.

Customer sees:

Driver Assigned

Driver Name

Driver Rating

Live Driver Location

ETA

Order Status

Driver Arrived

Delivered

The Customer App expects:

/drivers/live/{orderId}


for live driver tracking.

55. DELIVERY LIFECYCLE

Implement this complete lifecycle:

Customer Places Order
        ↓
Restaurant Receives Order
        ↓
Restaurant Accepts
        ↓
Restaurant Prepares Food
        ↓
Restaurant Marks Ready
        ↓
Dispatch Finds Eligible Driver
        ↓
Driver Receives Assignment
        ↓
Driver Accepts
        ↓
Driver Travels to Restaurant
        ↓
Driver Arrives
        ↓
Order Verification
        ↓
Driver Picks Up
        ↓
Driver Travels to Customer
        ↓
Driver Arrives
        ↓
Customer Verification
        ↓
Proof of Delivery
        ↓
Delivered
        ↓
Driver Earnings Recorded
        ↓
Customer Can Rate Delivery


56. AUTOMATIC DRIVER ASSIGNMENT SUPPORT

The Driver App must support assignments generated by the Management/Dispatch system.

Eligibility should consider:

Active driver

Online driver

Correct restaurant

Correct branch

Current location

Current availability

Current delivery status

Driver capacity

Vehicle requirements

Delivery zone

57. NEAREST DRIVER LOGIC

The backend/dispatch system may calculate the nearest eligible driver.

The Driver App must expose accurate:

latitude
longitude
heading
speed
updated_at


This data can be used by dispatch to calculate proximity.

Never fake location.

58. MULTI-BRANCH SUPPORT

Restaurant hierarchy:

Restaurant
   ↓
Branches
   ↓
Orders
   ↓
Drivers


Example:

Burger Lab
 ├── Main
 └── Branch Test1

Nonna's Trattoria
 └── Main


A driver may be assigned to:

Burger Lab → Main
Burger Lab → Branch Test1
Nonna's Trattoria → Main


The existing validation demonstrated this exact multi-restaurant/multi-branch model successfully.

59. DRIVER APP UI

Design a premium delivery-driver experience.

Use:

React

TypeScript

Vite

Tailwind CSS

shadcn/ui

Lucide Icons

Firebase

TanStack Query

Zustand

React Hook Form

Zod

MapLibre / Leaflet

Framer Motion

PWA

Responsive design

60. DRIVER UI PRINCIPLES

The driver is usually operating under time pressure.

Therefore:

Large buttons

Minimal text

High contrast

One-handed operation

Large status controls

Clear navigation

Clear earnings

Minimal steps

Fast loading

Offline resilience

Strong visual status indicators

Avoid complicated admin-style interfaces.

61. MAIN NAVIGATION

Use:

Home
Deliveries
Earnings
Notifications
Profile


During an active delivery:

Display a persistent:

ACTIVE DELIVERY


control.

62. ACTIVE DELIVERY SCREEN

This should be the most important screen.

Display:

Order Number

Restaurant

Branch

Pickup / Delivery destination

Map

ETA

Distance

Customer

Order Summary

Instructions

Call

Message

Navigation

Current Status

Primary Action Button

Example:

ARRIVE AT RESTAURANT


then:

PICK UP ORDER


then:

START DELIVERY


then:

ARRIVED


then:

COMPLETE DELIVERY


63. DESIGN SYSTEM

Use:

Dark mode

Light mode

Large touch targets

Responsive layout

Accessible components

WCAG AA

Loading skeletons

Error states

Empty states

Offline banners

Toast notifications

Confirmation dialogs

64. PERFORMANCE

Target:

Fast startup

Low memory usage

Low battery consumption

Optimized GPS

Lazy loading

Code splitting

Image optimization

Realtime listener optimization

Offline caching

Efficient Firebase queries

65. LOGGING / DEBUGGING

During development, provide structured logs.

Example:

[AUTH] Driver authenticated: drv-001

[FIREBASE] Driver profile loaded

[ASSIGNMENT] 8 active assignments found

[ELIGIBILITY]
Driver: drv-001
Restaurant: rst-burgerlab
Branch: brn_xxx
Result: ELIGIBLE

[ORDER]
FF-033291 received

[LOCATION]
Updated: -25.xxxxx, 28.xxxxx

[STATUS]
FF-033291 → picked_up


Production logging must not expose sensitive information.

66. DATA INTEGRITY

Enforce:

No duplicate driver profiles

No duplicate assignments

No duplicate order events

No duplicate earnings

No duplicate delivery completion

No invalid restaurant assignment

No invalid branch assignment

No unauthorized order access

No deletion of historical assignments

The existing validation confirmed uniqueness of assignment tuples and preservation of inactive assignment history.

67. TESTING REQUIREMENTS

Create automated tests for:

Driver Login

Driver Profile

Multiple Restaurant Assignment

Multiple Branch Assignment

All Branches Expansion

Duplicate Assignment Prevention

Assignment Removal

Inactive Assignment History

Restaurant Eligibility

Branch Eligibility

Unauthorized Driver Rejection

Order Assignment

Order Acceptance

Order Rejection

Restaurant Arrival

Pickup

Customer Arrival

Proof of Delivery

Delivery Completion

GPS Tracking

Realtime Updates

Offline Mode

Reconnect

Duplicate Event Prevention

Earnings

Notifications

Support

68. CRITICAL ACCEPTANCE TEST

Create an automated test equivalent to this scenario:

Login as Super Admin.

Open Driver Management.

Select a driver.

Assign the driver to Restaurant A.

Select All Branches.

Assign the same driver to Restaurant B.

Select All Branches.

Verify concrete branch assignments were created.

Verify no duplicate tuples exist.

Edit the driver.

Remove one branch.

Verify assignment becomes is_active=false.

Verify historical assignment remains.

Create/identify a ready order.

Ensure restaurant and branch are authoritative.

Attempt assignment to unauthorized driver.

Confirm assignment is rejected.

Assign eligible driver.

Confirm Firebase stores driver assignment.

Driver App receives assignment.

Driver accepts.

Driver arrives at restaurant.

Driver picks up.

Driver location updates.

Customer receives live location.

Driver arrives at customer.

Driver verifies delivery.

Driver completes delivery.

Customer sees Delivered.

Driver earnings are recorded.

The existing validation report successfully demonstrated the critical authorization portion of this workflow, including rejection of an unauthorized driver and successful assignment of the exact eligible driver.

69. ROLE / PERMISSION MODEL

Driver permissions must be limited.

Driver can:

View own profile

View own assignments

View authorized delivery orders

Accept delivery

Reject delivery

Update delivery status

Submit proof of delivery

Update own location

View own earnings

View own history

Contact support

Driver cannot:

Create restaurants

Edit menus

Edit restaurant pricing

Assign drivers

Access other drivers

Access admin financial data

Modify customer accounts

Modify another driver's assignments

Access unrelated orders

Change order ownership

70. FIREBASE DATA STRUCTURE

Respect the existing ecosystem.

Expected structures include:

/drivers/{driverId}

/driverAssignments/{assignmentKey}

/orders/{orderId}

/drivers/live/{orderId}

/restaurants/{restaurantId}

/menus/{restaurantId}/...

/notifications/...

/support/...


Do not create alternate versions such as:

/deliveryDrivers
/driverData
/driverRestaurants
/deliveryOrders


unless the existing database explicitly requires them.

71. SHARED TYPES

Create shared interfaces for:

Driver

DriverAssignment

Restaurant

Branch

Order

OrderItem

Delivery

DeliveryEvent

Customer

DriverLocation

Payment

Earning

Notification

SupportTicket



Keep these types compatible with the Customer App and Management Console.

72. ORDER VIEW MODEL

Create:

DriverOrderViewModel


containing:

id
orderNumber
customer
restaurant
branch
pickupAddress
deliveryAddress
items
subtotal
deliveryFee
serviceFee
tax
discount
tip
total
paymentStatus
orderStatus
driverStatus
timeline
eta
distance
driver
specialInstructions
deliveryInstructions
proofOfDelivery


Build this from the existing Firebase data rather than duplicating records.

73. SECURITY WARNING

Do not assume that hiding buttons in the Driver App is sufficient security.

Client-side permissions are NOT security.

All sensitive operations must be enforced using:

Firebase Authentication

Firebase Security Rules

Callable Cloud Functions where required

Server-side validation

The existing validation report specifically notes that browser permission testing does not prove protection against malicious direct Firebase callers and that restrictive production Firebase rules still need to be deployed.

Therefore:

Implement the required Firebase Authentication identity.

Implement restrictive production RTDB rules.

Implement server-side assignment guards.

Never trust driverId supplied by the client.

Always derive the authenticated driver identity from Firebase Authentication.

74. NO DEMO DATA

Do not generate fake:

Drivers

Orders

Restaurants

Customers

Assignments

Locations

Earnings

Payments

Reviews

Use the existing Firebase data.

If Firebase is empty:

Display an appropriate empty state.

Do not silently create fake production records.

75. BUILD ORDER

Build the application in this exact sequence:

Phase 1

Firebase integration

Authentication

Driver identity

Driver profile

Security

Phase 2

Driver assignments

Restaurant relationships

Branch relationships

Eligibility

Assignment history

Phase 3

Home Dashboard

Online/offline status

Notifications

Available deliveries

Phase 4

Order details

Order acceptance

Order rejection

Restaurant pickup

Phase 5

Live GPS

Maps

Navigation

Customer delivery

Phase 6

Proof of delivery

Order completion

Timeline

Notifications

Phase 7

Earnings

Wallet

History

Performance

Phase 8

Support

Messaging

Profile

Settings

Phase 9

Offline support

Realtime optimization

Security hardening

Phase 10

Automated testing

Performance testing

Production build

76. LOVABLE DEVELOPMENT INSTRUCTIONS

Do not attempt to build everything as disconnected mock screens.

Every screen must be connected to the real Firebase data.

Every button must perform its intended operation.

Every Firebase mutation must have:

Validation

Error handling

Loading state

Success state

Rollback where necessary

Audit/event logging

Realtime synchronization where required.

Do not create fake API responses.

Do not hardcode restaurant names.

Do not hardcode driver names.

Do not hardcode order numbers.

Do not hardcode branch IDs.

Do not hardcode assignment IDs.

Read them from Firebase.

77. FINAL SYSTEM REQUIREMENT

When the build is complete, the Driver App must be capable of participating in this real production workflow:

CUSTOMER
   ↓
Places Food Order
   ↓
RESTAURANT
   ↓
Accepts Order
   ↓
KITCHEN
   ↓
Prepares Food
   ↓
RESTAURANT
   ↓
Marks Order Ready
   ↓
DISPATCH
   ↓
Finds Eligible Driver
   ↓
DRIVER APP
   ↓
Driver Receives Assignment
   ↓
Driver Accepts
   ↓
Driver Navigates to Correct Restaurant Branch
   ↓
Driver Picks Up Food
   ↓
DRIVER GPS
   ↓
Customer Sees Live Location
   ↓
Driver Navigates to Customer
   ↓
Customer Verification
   ↓
Proof of Delivery
   ↓
Delivered
   ↓
CUSTOMER APP
   ↓
Order Completed
   ↓
DRIVER APP
   ↓
Earnings Recorded
   ↓
MANAGEMENT CONSOLE
   ↓
Order / Delivery / Financial Records Updated


78. DEFINITION OF DONE

The project is NOT complete until:

Firebase connects successfully.

Existing driver profiles load.

Existing driver assignments load.

Multiple restaurant assignments work.

Multiple branch assignments work.

All Branches resolves to concrete branch IDs.

Duplicate assignments are prevented.

Removed assignments become inactive instead of being deleted.

Driver eligibility checks exact restaurant AND branch.

Unauthorized drivers are rejected.

Authorized drivers receive assignments.

Drivers can accept/reject deliveries.

Drivers can navigate to restaurants.

Drivers can verify pickup.

Drivers can update delivery status.

Driver GPS works.

/drivers/live/{orderId} is updated correctly.

Customer tracking can consume the live location.

Drivers can complete deliveries.

Proof of delivery works.

Earnings are recorded.

Delivery history works.

Notifications work.

Support works.

Offline/reconnect handling works.

Realtime synchronization works.

Firebase security rules protect private data.

All important mutations are validated server-side.

No fake production data exists.

No duplicate records are generated.

Automated tests pass.

Production build succeeds.

79. MOST IMPORTANT RULE

DO NOT BUILD THE DRIVER APP AS AN ISOLATED APPLICATION.

It is one component of the ForkFleet ecosystem.

The following three applications must operate from the same underlying business model:

CUSTOMER APP
      ↕
FIREBASE
      ↕
MANAGEMENT CONSOLE
      ↕
FIREBASE
      ↕
DRIVER APP


All three applications must understand the same:

Restaurant IDs

Branch IDs

Driver IDs

Customer IDs

Order IDs

Assignment IDs

Statuses

Timestamps

Delivery events

GPS locations

Payments

Notifications

The Driver App must therefore integrate with the existing Firebase database and existing ForkFleet data structures first, rather than creating a new architecture.

Build this as a production-ready application, not a prototype.

Do not skip requirements.

Do not replace existing Firebase structures without first inspecting and preserving compatibility.

Do not create duplicate data.

Do not bypass restaurant/branch authorization.

Do not trust client-side authorization.

Use the existing Firebase data as the source of truth.

When uncertain about an existing field or node, inspect the Firebase structure and existing application code before creating a new one.

FINAL COMMAND TO LOVABLE

Start by inspecting the existing ForkFleet project, Firebase integration, Firebase Realtime Database structure, existing driver management implementation, driver assignment implementation, Orders implementation, Dispatch implementation, and the existing Customer App data contract.

Preserve all existing working functionality.

Then implement the Driver App against that existing infrastructure.

Do not break the Management Console.

Do not break the Customer App.

Do not create a second Firebase project.

Do not duplicate existing data.

Build the Driver App feature-by-feature in the order specified above and verify each feature against the real Firebase database before proceeding.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/59f588d9-7b6f-4646-a2f1-1888eff87ba0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
