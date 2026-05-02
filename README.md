# Luxury Concierge CRM 

Un sistema CRM integral y de ultra-lujo diseñado específicamente para agencias de viajes y servicios de concierge premium. Combina una potente gestión de clientes con inteligencia artificial y portales inmersivos de cara al cliente (inspirado en la estética visual de *Black Tomato*).

![The Singular Choice](public/photo-9.png)

## 💎 Características Principales

### 1. CRM Operativo de Alta Gama
- **Gestión de Leads Avanzada:** Control del ciclo de vida del cliente (Frío, Potencial, Activo) con métricas de conversión en tiempo real.
- **Memoria de Estilo de Vida:** Almacenamiento estructurado de preferencias críticas (`lifestyle_prefs`): alergias, temperatura de habitación preferida, tipo de almohada, marcas favoritas, etc.
- **Tablero de Control Multicanal:** Historial unificado de correos electrónicos, llamadas, notas de IA y reuniones agendadas.

### 2. Portal VIP Inmersivo (Client-Facing)
- **Estética Ultra Premium:** Diseño oscuro, tipografía Serif elegante y acentos dorados/crema para una experiencia de usuario que grita lujo.
- **Itinerario Interactivo (Roadmap):** Timeline desplegable que integra imágenes de alta resolución de los destinos y detalles logísticos confidenciales.
- **Motor de Emociones (Mood Narrative):** Una visión narrativa generada por inteligencia artificial que se inyecta en el portal para "vender el sentimiento" del viaje antes de que comience.
- **Bóveda Digital:** Gestor seguro de archivos donde el concierge puede arrastrar PDFs y billetes para que el cliente los descargue de manera cifrada.

### 3. ProInsight AI
- **Generación de Experiencias (Groq AI):** Utiliza modelos de IA ultrarrápidos (Llama 3) para redactar propuestas inmersivas y poéticas basadas en los gustos del cliente y el "mood" deseado (silencio, aventura, romanticismo).
- **Asesoramiento de Estrategia:** Resúmenes y análisis de sentimiento de los contactos para sugerir el próximo mejor paso comercial.

### 4. Integraciones
- **Supabase:** Base de datos PostgreSQL robusta, Storage para la Bóveda Digital, y Row Level Security (RLS) impenetrable.
- **Telegram:** Notificaciones automatizadas y botón de conexión directa con el "Concierge Privado" en el Portal VIP.
- **Stripe:** Preparado para procesamiento de pagos y cotizaciones.

## 🚀 Tecnologías Utilizadas

- **Frontend:** Next.js 16 (App Router), React, Tailwind CSS, Lucide Icons.
- **Backend & Database:** Supabase (PostgreSQL, Storage, Auth).
- **Inteligencia Artificial:** Groq SDK (Llama 3.1).
- **Despliegue:** Preparado para Vercel.

## 🛠️ Instalación y Desarrollo Local

1. Clona el repositorio:
   ```bash
   git clone https://github.com/Charran78/CONCIERGE_CRM.git
   cd CONCIERGE_CRM
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno creando un archivo `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key
   GROQ_API_KEY=tu_groq_api_key
   ```

4. Ejecuta las migraciones de base de datos en tu panel de Supabase usando el archivo ubicado en `supabase/migrations/001_initial_schema.sql`.

5. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## 🔒 Seguridad y Arquitectura
Este proyecto implementa políticas RLS (Row Level Security) estrictas. Los clientes solo tienen acceso de lectura (sin autenticación requerida) a su propio Portal VIP y Bóveda Digital a través de un `share_token` seguro encriptado. Los asesores deben autenticarse para modificar el CRM y subir recursos.
