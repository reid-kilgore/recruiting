# Job Creation Form - Compact Layout

This directory contains the **Compact Multi-Column Job Ad Layout** component and its supporting layout components, extracted from the ChatGPT canvas design.

## Components

### Main Component
- **`JobCreationFormCompact.tsx`** - The complete job creation form with 12-column grid layout

### Layout Components
- **`layout/Section.tsx`** - Card wrapper with icon and section heading
- **`layout/Field.tsx`** - Grid-span field wrapper with label and hint text
- **`layout/Chip.tsx`** - Small inline removable badge component
- **`layout/Input.tsx`** - Styled input component with focus states
- **`layout/Textarea.tsx`** - Styled textarea component with focus states

## Features

### 🎯 **Compact 12-Column Layout**
- Responsive grid system (12 columns)
- Smart breakpoints: `col-span-12 sm:col-span-6 lg:col-span-4`
- Efficient space utilization for complex forms

### 📋 **Complete Job Creation Flow**
1. **Company Information**
   - Company name, logo upload, welcome video
   - Company description and culture tags
   - Visual media thumbnails (4-up grid)

2. **Job Details**
   - Job title, locations (multiple supported)
   - Job description and required skills
   - Dynamic tag management with Enter-to-add

3. **Compensation & Benefits**
   - Wage/salary with tip eligibility
   - Benefits management with dynamic chips
   - Wage details and policy information

4. **Schedule Information**
   - Schedule type selection (Part-time/Full-time/Casual)
   - Expected hours and flexibility notes

5. **Application Questions**
   - Dynamic question builder (Text/Video/Multiple Choice)
   - Two-column question layout
   - Remove/add question functionality

### 🎨 **Design System**
- **Icons**: Emoji-based section icons (🏢 🧰 💵 📅 ❓)
- **Colors**: Consistent gray-based palette with blue accents
- **Typography**: Precise font sizing (`text-[13px]`, `text-[11px]`)
- **Spacing**: Tailwind spacing system with custom gaps

### ⚡ **Interactive Features**
- **Dynamic Chips**: Add/remove tags with Enter key and × button
- **Multi-location Support**: Add multiple job locations
- **Skill Management**: Dynamic skill tag system
- **Benefits Builder**: Flexible benefits list management
- **Question Builder**: Configurable application questions

## Usage

```tsx
import JobCreationFormCompact from './components/JobCreation/JobCreationFormCompact';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <JobCreationFormCompact />
    </div>
  );
}
```

## Component Architecture

### State Management
The form uses React `useState` hooks for:
- `culture` - Company culture tags
- `skills` - Required job skills
- `benefits` - Job benefits list
- `locations` - Job location addresses
- Individual input states for adding new items

### Layout Pattern
```tsx
<Section title="Section Name" icon={<span>🏢</span>}>
  <Field span="col-span-12 lg:col-span-8" label="Field Label" hint="Helper text">
    <Input placeholder="Enter value..." />
  </Field>
</Section>
```

### Chip Management Pattern
```tsx
// Display existing chips
{items.map((item, i) => 
  <Chip key={i} onRemove={() => setItems(prev => prev.filter((_, j) => j !== i))}>
    {item}
  </Chip>
)}

// Add new chip on Enter
<Input 
  value={newItem}
  onChange={e => setNewItem(e.target.value)}
  onKeyDown={e => {
    if (e.key === 'Enter' && newItem.trim()) {
      setItems(p => [...p, newItem.trim()]);
      setNewItem("");
      e.preventDefault();
    }
  }}
/>
```

## TypeScript Support

All components are fully typed with TypeScript interfaces:
- Props interfaces for each component
- Event handler typing
- HTML element prop spreading with proper typing

## Styling

- **Framework**: Tailwind CSS
- **Grid System**: CSS Grid with 12-column layout
- **Responsive**: Mobile-first design with `sm:` and `lg:` breakpoints
- **Focus States**: Blue ring focus indicators on all inputs
- **Hover States**: Interactive hover effects on buttons and chips

## Customization

### Grid Spans
Modify the default span in `Field.tsx`:
```tsx
span = "col-span-12 sm:col-span-6 lg:col-span-4"
```

### Colors
Update color scheme in component classes:
- Primary: `bg-blue-600`, `ring-blue-500`
- Gray palette: `bg-gray-50`, `text-gray-700`, `border-gray-300`
- Interactive: `hover:bg-red-100`, `text-red-600`

### Icons
Replace emoji icons with SVG or icon library:
```tsx
<Section title="Company Information" icon={<BuildingIcon />}>
```
