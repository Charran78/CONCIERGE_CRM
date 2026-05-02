<div align="center">

# 🚀 TOTAL PRO Lead Converter

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![AI Powered](https://img.shields.io/badge/🧠_AI_Powered-ProInsight-8A2BE2)
![Mobile First](https://img.shields.io/badge/📱_Mobile_First-Responsive-FFA500)
![CRM](https://img.shields.io/badge/🏆_CRM-Evolutivo-4F46E5)
![License](https://img.shields.io/badge/License-Proprietary-red)

<br />

<img src="./DOCS/LOGOS/lead_converter.png" alt="TOTAL PRO Lead Converter" width="600" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />

</div>

**TOTAL PRO Lead Converter** es una plataforma de gestión de ventas de próxima generación que transforma la forma en que las empresas interactúan con sus clientes potenciales. A diferencia de un CRM tradicional, integra **Inteligencia Artificial Generativa (ProInsight AI)** para crear una "Memoria Evolutiva" de cada contacto y facilitar el cierre de ventas mediante **Portales de Estrategia** personalizados.

---

## 🌟 Funcionalidades Clave

### 🧠 CRM Proactivo con Memoria Evolutiva

* **Análisis Omnisciente**: La IA analiza cada nota, email y cita para actualizar un "Resumen Maestro" que evoluciona con el tiempo.
* **Línea de Tiempo Unificada**: Visualización cronológica de emails enviados, citas de calendario e insights generados por IA.
* **Acciones Rápidas**: Llamadas, agendamiento de citas y redacción de emails asistida por IA desde una única interfaz centralizada.

### 🎒 Portales de Estrategia (Client Workspaces)

* **Roadmap Personalizado**: Crea checklists de implementación compartidos con el cliente para guiarlo hacia el éxito.
* **Repositorio de Recursos**: Comparte materiales, demos y documentos estratégicos de forma segura.
* **Asesor de Estrategia IA**: Un consultor dedicado que analiza el historial del lead y sugiere los mejores pasos y materiales para cerrar la venta.
* **Acceso Seguro**: Los portales se acceden mediante un token único (hash seguro), sin necesidad de login para el cliente final.

### 📊 Dashboard de Alto Impacto

* **Métricas en Tiempo Real**: Visualización de leads activos, tasa de conversión y valor del pipeline.
* **Alertas Inteligentes**: Notificaciones sobre leads que requieren atención inmediata o hitos alcanzados en los portales.

### 📧 Hub de Email con IA

* **Redacción Estratégica**: Generación automática de borradores de email basados en el contexto específico de cada lead.
* **Historial Persistente**: Registro automático de toda la comunicación en la base de datos para asegurar la trazabilidad.

### 🧩 Componentes modales reutilizables
- `AIModal`, `ScheduleModal`, `QuickEmailModal`, `QuoteBuilderModal`, `PhoneCallModal`…
- Todos ellos **100% responsivos** (mobile-first con Tailwind CSS).

---

## 🗄️ Modelo de Datos

La aplicación utiliza un esquema relacional optimizado en Supabase para mantener la integridad de la estrategia de ventas:

| Tabla | Propósito |
|-------|-----------|
| `contacts` | Lead principal + campo `summary_ai` (Resumen Maestro) |
| `contact_notes` | Insights generados por IA (razonamiento, sentimiento, health score) |
| `email_history` | Registro de correos enviados (asunto, cuerpo, fecha) |
| `calendar_events` | Citas vinculadas a contactos |
| `quotes` | Cotizaciones (items, totales, estado) |
| `client_portals` | Portales de cliente (token único, activo/inactivo) |
| `portal_tasks` | Tareas del roadmap (orden, completado) |
| `portal_resources` | Recursos compartidos (título, URL) |
| `portal_activity` | Traza de acciones del cliente (acceso, tarea completada, etc.) |

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|------|-------------|
| **Frontend** | Next.js 14 (App Router), React, Tailwind CSS |
| **Backend + Auth** | Supabase (PostgreSQL, Realtime, Row Level Security) |
| **IA Generativa** | ProInsight AI (motor sobre Groq/LLM) – llamadas desde API routes de Next.js para seguridad de claves |
| **Iconos** | Lucide React |
| **Animaciones** | Tailwind CSS (clases `animate-*`) |

---

## ⚙️ Configuración e Instalación

### 1. Clonar y Preparar

```bash
git clone https://github.com/charran78/total-pro-lead-converter.git
cd TOTAL_PRO_LEAD_CONVERTER
npm install
```

### 2. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes claves:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
GROQ_API_KEY=tu_api_key_de_groq
```

### 3. Ejecutar en Desarrollo

```bash
npm run dev
```

---

## 📂 Estructura del Proyecto

* `src/app/`: Rutas, layouts y páginas principales (incluyendo el Portal público en `/portal/[token]`).
* `src/components/`:
  * `crm/`: Ficha del lead, modales de IA y gestión de contactos.
  * `portal/`: Componentes del espacio de trabajo del cliente.
  * `emails/`: Hub de redacción y gestión de comunicaciones.
  * `dashboard/`: Vistas de métricas y alertas.
* `src/hooks/`: Lógica reutilizable para Portales, CRM e IA.
* `src/lib/`: Utilidades de conexión con Supabase y envoltorio de la API de Groq.

## 📂 Estructura del proyecto (resumida)
```text
src/
├── app/
│   ├── page.tsx                 # Layout principal + routing de tabs
│   ├── portal/[token]/page.tsx  # Vista pública del cliente
│   └── api/                     # Rutas seguras para IA (server-side)
├── components/
│   ├── auth/                    # Login/registro
│   ├── crm/                     # CRMView, ContactDetailModal, AIModal...
│   ├── portals/                 # PortalsDashboard, PortalEditor, ClientPortalView
│   ├── emails/                  # EmailHubView, QuickEmailModal
│   ├── calendar/                # CalendarView, ScheduleModal
│   ├── pricing/                 # PricingView (registro de intención)
│   ├── dashboard/               # DashboardView, métricas
│   └── ui/                      # StatusBadge, StatusDropdown, etc.
├── hooks/
│   └── usePortals.ts            # Lógica para portales (activar, tareas, recursos...)
├── lib/
│   ├── supabase.ts              # Cliente de Supabase
│   ├── types.ts                 # Tipos globales (Contact, CalendarEvent...)
│   └── utils.ts                 # fetchAI, extractJSON, cn, etc.

```

## 📱 Diseño responsivo (mobile-first)

Todos los componentes han sido adaptados siguiendo una guía estricta:

Paddings: px-4 py-4 md:px-8 md:py-8 (móvil compacto, escritorio amplio).

Flex/Grid: flex-col md:flex-row, grid-cols-1 md:grid-cols-n.

Tablas: envueltas en <div className="overflow-x-auto w-full"> + min-w-[600px] md:min-w-full.

Anchos fijos → w-full con límite md:max-w-xl.

Imágenes: max-w-full h-auto.

Modales: centrados, con padding responsivo y max-h-[90vh].

Esto garantiza una experiencia óptima tanto en móvil como en escritorio.

---

## 🗺️ Roadmap de Próximas Mejoras

* [ ] **Programación de Emails**: Capacidad de agendar correos para su envío automático posterior.
* [ ] **Conectividad Externa**: Exportación de notas y resúmenes a Notion u Obsidian.
* [ ] **Automatizaciones**: Webhooks para integración con n8n y otros sistemas de workflow.
* [ ] **Sistema BYOK**: Opción para que el usuario final traiga su propia clave de IA (Bring Your Own Key).

---

Desarrollado con ❤️ para transformar leads en clientes de por vida.
