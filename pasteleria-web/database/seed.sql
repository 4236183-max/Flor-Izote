INSERT INTO categorias (nombre, descripcion) VALUES
  ('Pasteles', 'Pasteles artesanales para toda ocasión'),
  ('Cupcakes', 'Pequeños bocados de felicidad'),
  ('Galletas', 'Horneadas cada mañana'),
  ('Postres', 'Postres individuales y para compartir'),
  ('Tartas', 'Tartas de fruta y crema'),
  ('Productos especiales', 'Ediciones de temporada y regalos')
ON CONFLICT (nombre) DO NOTHING;

-- Las fotos se leen de public/images/productos/<slug>.jpg (si no existe, el sitio muestra un ícono).
INSERT INTO productos (categoria_id, nombre, descripcion, precio, destacado, imagen_url)
SELECT c.id, v.nombre, v.descripcion, v.precio, v.destacado, v.img
FROM (VALUES
  ('Pasteles', 'Tres Leches Clásico', 'Bizcocho esponjoso bañado en tres leches con crema chantilly y canela.', 18.50, true, '/images/productos/tres-leches-clasico.jpg'),
  ('Pasteles', 'Pastel de Chocolate', 'Capas de bizcocho de cacao con ganache de chocolate semiamargo.', 22.00, true, '/images/productos/pastel-de-chocolate.jpg'),
  ('Pasteles', 'Red Velvet', 'Terciopelo rojo con frosting suave de queso crema.', 24.00, true, '/images/productos/red-velvet.jpg'),
  ('Cupcakes', 'Cupcake de Vainilla', 'Vainilla con buttercream cremoso y chispas de colores (unidad).', 2.75, false, '/images/productos/cupcake-de-vainilla.jpg'),
  ('Cupcakes', 'Cupcake de Fresa', 'Bizcocho de vainilla con buttercream de fresa natural (unidad).', 2.75, true, '/images/productos/cupcake-de-fresa.jpg'),
  ('Galletas', 'Galletas de Chispas de Chocolate', 'Bolsa de 6 galletas suaves por dentro y crujientes por fuera.', 5.50, false, '/images/productos/galletas-de-chispas-de-chocolate.jpg'),
  ('Galletas', 'Alfajores de Dulce de Leche', 'Caja de 8 alfajores rellenos y rebozados en coco.', 7.00, false, '/images/productos/alfajores-de-dulce-de-leche.jpg'),
  ('Postres', 'Flan de Caramelo', 'Flan cremoso con caramelo casero (porción).', 3.25, false, '/images/productos/flan-de-caramelo.jpg'),
  ('Postres', 'Cheesecake de Frutos Rojos', 'Base de galleta, crema suave y salsa de frutos rojos (porción).', 4.50, false, '/images/productos/cheesecake-de-frutos-rojos.jpg'),
  ('Tartas', 'Tarta de Frutas', 'Masa sablée, crema pastelera y fruta fresca de temporada.', 16.00, true, '/images/productos/tarta-de-frutas.jpg'),
  ('Tartas', 'Pionono de Fresa', 'Rollo de bizcocho con crema y fresas, bañado con chocolate.', 14.00, false, '/images/productos/pionono-de-fresa.jpg'),
  ('Productos especiales', 'Caja Regalo', 'Selección de 6 cupcakes y 6 galletas en caja de regalo.', 19.00, false, '/images/productos/caja-regalo.jpg')
) AS v(cat, nombre, descripcion, precio, destacado, img)
JOIN categorias c ON c.nombre = v.cat
WHERE NOT EXISTS (SELECT 1 FROM productos);
