# Job Creation Form - Compact Layout

A sophisticated job creation form built with React, TypeScript, and Tailwind CSS, featuring a compact 12-column grid layout for efficient space utilization.

## 🎯 Overview

This project contains the **Compact Multi-Column Job Ad Layout Preview** component extracted from ChatGPT canvas, designed for creating comprehensive job postings with an intuitive, space-efficient interface.

## ✨ Features

### 📋 **Complete Job Creation Workflow**
- **Company Information**: Name, logo, description, culture tags, visual media
- **Job Details**: Title, locations, description, required skills
- **Compensation**: Wage/salary, benefits, tip eligibility
- **Schedule**: Type, hours, flexibility notes
- **Application Questions**: Dynamic question builder with multiple types

### 🎨 **Advanced UI Components**
- **12-Column Responsive Grid**: Efficient layout with smart breakpoints
- **Dynamic Chip System**: Add/remove tags with Enter key and × button
- **Interactive Form Fields**: Focus states, validation, and helper text
- **Multi-location Support**: Add and manage multiple job locations
- **Question Builder**: Text, Video, and Multiple Choice question types

### 🚀 **Technical Features**
- **TypeScript**: Full type safety with proper interfaces
- **Tailwind CSS**: Utility-first styling with custom design system
- **React Hooks**: Modern state management with useState
- **Responsive Design**: Mobile-first approach with breakpoint optimization
- **Component Architecture**: Modular, reusable layout components

## 🏗️ Project Structure

```
src/
├── components/
│   └── JobCreation/
│       ├── JobCreationFormCompact.tsx    # Main form component
│       ├── layout/
│       │   ├── Section.tsx               # Card wrapper with icons
│       │   ├── Field.tsx                 # Grid field with labels
│       │   ├── Chip.tsx                  # Removable badge component
│       │   ├── Input.tsx                 # Styled input component
│       │   └── Textarea.tsx              # Styled textarea component
│       └── README.md                     # Component documentation
├── App.tsx                               # Root application
└── main.tsx                              # Application entry point
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation

1. **Clone and navigate**:
```bash
cd /Users/jim/source/job-creation-form
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start development server**:
```bash
npm run dev
```

4. **Open browser**: Navigate to `http://localhost:5173`

### Building for Production
```bash
npm run build
```

## 🎨 Design System

### Grid Layout
- **12-column CSS Grid**: `grid-cols-12`
- **Responsive Spans**: `col-span-12 sm:col-span-6 lg:col-span-4`
- **Smart Breakpoints**: Mobile-first with `sm:` and `lg:` modifiers

### Color Palette
- **Primary**: Blue (`bg-blue-600`, `ring-blue-500`)
- **Gray Scale**: `bg-gray-50`, `text-gray-700`, `border-gray-300`
- **Interactive**: `hover:bg-red-100`, `text-red-600`
- **Success/Error**: Context-aware color states

### Typography
- **Precise Sizing**: `text-[13px]`, `text-[11px]` for fine control
- **Font Weights**: `font-medium`, `font-semibold` for hierarchy
- **Line Heights**: Optimized for form readability

## 🧩 Component Usage

### Basic Form Section
```tsx
import Section from './layout/Section';
import Field from './layout/Field';
import Input from './layout/Input';

<Section title="Company Information" icon={<span>🏢</span>}>
  <Field span="col-span-12 lg:col-span-8" label="Company Name *">
    <Input placeholder="e.g., TechCorp Solutions" />
  </Field>
</Section>
```

### Dynamic Chip Management
```tsx
import Chip from './layout/Chip';

// Display chips with remove functionality
{tags.map((tag, i) => 
  <Chip key={i} onRemove={() => setTags(prev => prev.filter((_, j) => j !== i))}>
    {tag}
  </Chip>
)}

// Add new chip on Enter key
<Input 
  value={newTag}
  onChange={e => setNewTag(e.target.value)}
  onKeyDown={e => {
    if (e.key === 'Enter' && newTag.trim()) {
      setTags(p => [...p, newTag.trim()]);
      setNewTag("");
      e.preventDefault();
    }
  }}
/>
```

## 🎯 Key Features Demonstrated

### 1. **Efficient Space Utilization**
- Compact 12-column grid maximizes screen real estate
- Smart responsive breakpoints adapt to different screen sizes
- Logical grouping of related fields

### 2. **Interactive Tag Management**
- Culture tags, skills, benefits, and locations as manageable chips
- Enter-to-add functionality for quick data entry
- Click-to-remove with visual feedback

### 3. **Professional Form Design**
- Consistent spacing and typography
- Clear visual hierarchy with icons and sections
- Focus states and hover effects for better UX

### 4. **Flexible Question Builder**
- Support for Text, Video, and Multiple Choice questions
- Two-column layout for efficient space usage
- Dynamic add/remove functionality

## 🔧 Customization

### Modifying Grid Spans
Update default spans in `Field.tsx`:
```tsx
span = "col-span-12 sm:col-span-6 lg:col-span-3"  // 4-column layout
```

### Custom Icons
Replace emoji icons with SVG or icon libraries:
```tsx
import { BuildingIcon } from '@heroicons/react/24/outline';

<Section title="Company Information" icon={<BuildingIcon className="w-5 h-5" />}>
```

### Color Scheme
Modify Tailwind classes for different color schemes:
```tsx
// Change primary color from blue to green
className="bg-green-600 text-white focus:ring-green-500"
```

## 📱 Responsive Behavior

- **Mobile (< 640px)**: Single column layout (`col-span-12`)
- **Tablet (640px+)**: Two column layout (`sm:col-span-6`)
- **Desktop (1024px+)**: Three/four column layout (`lg:col-span-4`)

## 🧪 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint (with warnings allowed)

### TypeScript Configuration
- Strict mode enabled for type safety
- Modern ES2020 target with DOM libraries
- JSX support with React 18 patterns

## 📄 License

MIT License - Feel free to use in your projects!

---

**Built with ❤️ using React, TypeScript, and Tailwind CSS**
