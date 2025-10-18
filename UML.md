
# {AppName} UML Class Diagram

This diagram outlines the core data models and their relationships within the {AppName} application.

```mermaid
classDiagram
    direction LR

    class UserProfile {
        +string uid
        +string firstName
        +string? lastName
        +string username
        +string email
        +string role
        +string? avatarUrl
        +string? createdAt
        +isAdmin()
    }

    class Group {
        +string id
        +string name
        +string? description
        +string coverImageUrl
        +number totalExpenses
        +string createdAt
        +list~UserProfile~ members
        +UserProfile createdBy
    }

    class Expense {
        +string id
        +string description
        +number amount
        +string date
        +string category
        +string splitType
        +list~ExpensePayer~ payers
        +list~ExpenseParticipant~ participants
    }

    class Settlement {
        +string id
        +number amount
        +string date
        +string? notes
        +UserProfile paidBy
        +UserProfile paidTo
    }

    class ExpensePayer {
        +UserProfile user
        +number amount
    }

    class ExpenseParticipant {
        +UserProfile user
        +number amountOwed
    }

    class HistoryEvent {
        +string id
        +string eventType
        +string description
        +string timestamp
        +UserProfile actor
        +object data
    }
    
    class SiteSettings {
      +string appName
      +object landingPage
      +object authPage
      +object about
      +object stats
      +list~string~ coverImages
    }

    UserProfile "1" -- "0..*" Group : creates
    UserProfile "1..*" -- "0..*" Group : member of
    Group "1" -- "0..*" Expense : contains
    Group "1" -- "0..*" Settlement : has
    Group "1" -- "0..*" HistoryEvent : logs
    
    Expense "1" -- "1..*" ExpensePayer : paid by
    Expense "1" -- "1..*" ExpenseParticipant : split for
    
    ExpensePayer --|> UserProfile
    ExpenseParticipant --|> UserProfile
    
    Settlement "1" -- "1" UserProfile : paid by
    Settlement "1" -- "1" UserProfile : paid to
    
    HistoryEvent "1" -- "1" UserProfile : performed by

```

### Relationships Explained:

*   **UserProfile & Group**:
    *   One `UserProfile` can create many `Group`s.
    *   Many `UserProfile`s can be members of many `Group`s.

*   **Group, Expense, Settlement, History**:
    *   One `Group` can contain multiple `Expense`s, `Settlement`s, and `HistoryEvent`s.

*   **Expense & UserProfile**:
    *   An `Expense` is paid by one or more `UserProfile`s (via the `ExpensePayer` link).
    *   An `Expense` is split among one or more `UserProfile`s (via the `ExpenseParticipant` link).

*   **Settlement & UserProfile**:
    *   A `Settlement` is a direct transaction from one `UserProfile` (`paidBy`) to another (`paidTo`).

*   **HistoryEvent & UserProfile**:
    *   Each `HistoryEvent` is triggered by a single `UserProfile` (the `actor`).

*   **SiteSettings**:
    *   This is a global configuration object, not directly linked to other models in this diagram, but it governs application-wide behavior and content.
