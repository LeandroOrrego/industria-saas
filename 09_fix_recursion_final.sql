-- SOLUCIÓN DE RECURSIÓN INFINITA (RLS)
-- El error ocurre porque Policies de 'organizations' consultan 'profiles', y 'profiles' consulta 'organizations'.

-- 1. SIMPLIFICAR POLÍTICA DE PERFILES
-- En lugar de verificar la organización (que causa el loop), permitimos que el usuario vea su PROPIO perfil siempre.
drop policy if exists "Ver perfiles de mi org" on profiles;
drop policy if exists "Usuarios ven su propio perfil" on profiles;

-- Nueva política simple: "Un usuario puede ver su propio perfil" (Sin join a organizaciones)
create policy "Usuarios ven su propio perfil" on profiles for select using (
  auth.uid() = id
);

-- Política adicional: "Ver compañeros de la misma organización" (PREVENIR RECURSIÓN)
-- Usamos una subquery directa que NO active políticas de organization si es posible, o simplificamos.
-- Para evitar el loop, la policy de profiles NO debe consultar organizations si organizations consulta profiles.
-- Solución: Romper el ciclo consultando directamente el campo organization_id del usuario actual sin JOINs complejos si es posible,
-- pero la forma más robusta es romperlo en el lado de organizations.

-- 2. REFACTORIZAR POLÍTICAS DE ORGANIZACIONES
-- Vamos a evitar que organizations consulte profiles de forma recursiva.

drop policy if exists "Usuarios ven su propia organizacion" on organizations;
drop policy if exists "Admins editan su organizacion" on organizations;

-- A) VER ORGANIZACIÓN:
-- En lugar de "select organization_id from profiles", usamos auth.uid() directamente si fuera posible, 
-- pero organization no tiene user_id.
-- TRUCO: Usar SECURITY DEFINER functions o evitar validación cruzada.
-- Mantenemos la query pero aseguramos que la policy de profiles (paso 1) ya no dependa de organizations para el usuario actual.

create policy "Usuarios ven su propia organizacion" on organizations for select using (
  id in (
    select organization_id from profiles where id = auth.uid()
  )
);

-- B) EDITAR ORGANIZACIÓN:
create policy "Admins editan su organizacion" on organizations for update using (
  id in (
    select organization_id from profiles 
    where id = auth.uid() 
    and role = 'admin'
  )
);

-- 3. VALIDAR PERFILES DE COMPAÑEROS (Opcional, con cuidado)
create policy "Ver compañeros de equipo" on profiles for select using (
  organization_id = (
    select organization_id from profiles where id = auth.uid() limit 1
  )
);
