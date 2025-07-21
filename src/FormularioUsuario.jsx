"use client"

import { useState, useCallback, useRef } from "react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { format, subYears, differenceInYears } from "date-fns"
import { useJsApiLoader, Autocomplete, GoogleMap, Marker } from "@react-google-maps/api"

const ESCOLARIDADES = ["Primaria", "Secundaria", "Preparatoria", "Universidad"]
const MAX_DATE = subYears(new Date(), 18)
const GOOGLE_MAPS_API_KEY = "AIzaSyAvPKf_MVfCMjXA2S7n0TWzYvxXMDuBVqg"
const libraries = ["places"]

function FormularioUsuario() {
  const [form, setForm] = useState({
    curp: "",
    nombre: "",
    apellido: "",
    fechaNacimiento: "",
    escolaridad: "",
    direccion: "",
    habilidades: [],
    habilidad: "",
    foto: null,
    fotoUrl: "",
    lat: null,
    lng: null,
  })

  const [preview, setPreview] = useState(null)
  const [errores, setErrores] = useState({})
  const [subiendo, setSubiendo] = useState(false)
  const [coordenadas, setCoordenadas] = useState(null)
  const autocompleteRef = useRef(null)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  })

  const onLoad = useCallback((autocomplete) => {
    autocompleteRef.current = autocomplete
  }, [])

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace()
      if (place.formatted_address && place.geometry) {
        const location = place.geometry.location
        const lat = location.lat()
        const lng = location.lng()
        setForm((prev) => ({
          ...prev,
          direccion: place.formatted_address,
          lat,
          lng,
        }))
        setCoordenadas({ lat, lng })
      } else {
        alert("Selecciona una dirección válida de las opciones")
      }
    }
  }

  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target
      setForm((prev) => ({ ...prev, [name]: value }))

      // Limpiar error cuando el usuario empiece a escribir
      if (errores[name]) {
        setErrores((prev) => ({ ...prev, [name]: null }))
      }
    },
    [errores],
  )

  const handleFoto = useCallback(
    (e) => {
      const file = e.target.files[0]
      if (!file) return
      if (file.type === "image/jpeg" || file.type === "image/png") {
        setForm((prev) => ({ ...prev, foto: file }))
        setPreview(URL.createObjectURL(file))
        if (errores.foto) {
          setErrores((prev) => ({ ...prev, foto: null }))
        }
      } else {
        alert("Solo se permiten imágenes JPEG o PNG.")
        e.target.value = ""
      }
    },
    [errores.foto],
  )

  const agregarHabilidad = useCallback(() => {
    if (form.habilidad.trim()) {
      setForm((prev) => ({
        ...prev,
        habilidades: [...prev.habilidades, prev.habilidad.trim()],
        habilidad: "",
      }))
    }
  }, [form.habilidad])

  const eliminarHabilidad = useCallback((index) => {
    setForm((prev) => ({
      ...prev,
      habilidades: prev.habilidades.filter((_, i) => i !== index),
    }))
  }, [])

  const validar = useCallback(() => {
    const errs = {}

    if (!form.curp || form.curp.length !== 18) {
      errs.curp = "La CURP debe tener exactamente 18 caracteres."
    }
    if (!form.nombre || !form.nombre.trim()) {
      errs.nombre = "El nombre es requerido."
    }
    if (!form.apellido || !form.apellido.trim()) {
      errs.apellido = "El apellido es requerido."
    }
    if (!form.fechaNacimiento) {
      errs.fechaNacimiento = "La fecha de nacimiento es requerida."
    }
    if (!form.escolaridad) {
      errs.escolaridad = "Selecciona un nivel de escolaridad."
    }
    if (!form.direccion || !form.direccion.trim()) {
      errs.direccion = "La dirección es requerida."
    }

    setErrores(errs)
    return Object.keys(errs).length === 0
  }, [form])

  const subirFotoAS3 = useCallback(async () => {
    if (!form.foto) return null

    console.log(" Subiendo foto a S3...")
    const formData = new FormData()
    formData.append("foto", form.foto)

    try {
      const res = await fetch("http://localhost:3001/subir-foto", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        console.log(" Error en subida de foto, continuando sin imagen")
        return null
      }

      const data = await res.json()

      if (data.url) {
        console.log(" Foto subida exitosamente:", data.url)
        return data.url
      } else {
        console.log(" Foto procesada pero sin URL (S3 no configurado)")
        return null
      }
    } catch (error) {
      console.error(" Error al subir foto:", error)
      console.log(" Continuando sin foto...")
      return null
    }
  }, [form.foto])

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()

      console.log(" Iniciando envío del formulario...")

      if (!validar()) {
        alert("Por favor corrige los errores en el formulario")
        return
      }

      try {
        setSubiendo(true)

        let fotoUrl = null
        if (form.foto) {
          fotoUrl = await subirFotoAS3()
          if (!fotoUrl) {
            // Mostrar advertencia pero continuar
            console.log(" No se pudo subir la foto, guardando usuario sin imagen")
          }
        }

        // Calcular edad
        const edadCalculada = differenceInYears(new Date(), new Date(form.fechaNacimiento))

        // Preparar datos
        const datosFinales = {
          curp: form.curp.trim(),
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          fechaNacimiento: form.fechaNacimiento,
          escolaridad: form.escolaridad,
          direccion: form.direccion.trim(),
          habilidades: form.habilidades,
          fotoUrl: fotoUrl,
          lat: form.lat,
          lng: form.lng,
          edad: edadCalculada,
        }

        console.log(" Enviando datos al servidor:", datosFinales)

        const res = await fetch("http://localhost:3001/usuarios", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(datosFinales),
        })

        const data = await res.json()

        if (res.ok) {
          const mensaje = fotoUrl
            ? " Usuario guardado exitosamente con foto!"
            : " Usuario guardado exitosamente (sin foto)!"

          alert(mensaje)
          console.log(" Usuario creado:", data)

          // Limpiar formulario
          setForm({
            curp: "",
            nombre: "",
            apellido: "",
            fechaNacimiento: "",
            escolaridad: "",
            direccion: "",
            habilidades: [],
            habilidad: "",
            foto: null,
            fotoUrl: "",
            lat: null,
            lng: null,
          })
          setPreview(null)
          setErrores({})
          setCoordenadas(null)

          // Limpiar input de archivo
          const fileInput = document.querySelector('input[type="file"]')
          if (fileInput) fileInput.value = ""
        } else {
          console.error(" Error del servidor:", data)
          alert(`Error: ${data.error || "Error desconocido"}`)
        }
      } catch (err) {
        console.error(" Error de conexión:", err)
        alert(`Error de conexión: ${err.message}`)
      } finally {
        setSubiendo(false)
      }
    },
    [form, validar, subirFotoAS3],
  )

  if (loadError) return <div>Error al cargar Google Maps</div>
  if (!isLoaded) return <div>Cargando Google Maps...</div>

  return (
    <div className="container">
      <h2 className="title">Formulario de Usuario</h2>
      <form onSubmit={handleSubmit}>
        {/* CURP */}
        <div className="form-group">
          <label className="label">CURP *:</label>
          <input
            name="curp"
            value={form.curp}
            maxLength={18}
            onChange={handleChange}
            className={`input ${errores.curp ? "error-input" : ""}`}
            placeholder="18 caracteres (ej: ABCD123456HDFGHI01)"
          />
          {errores.curp && <p className="error">{errores.curp}</p>}
          <small>Caracteres: {form.curp.length}/18</small>
        </div>

        {/* Nombre */}
        <div className="form-group">
          <label className="label">Nombre *:</label>
          <input
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            className={`input ${errores.nombre ? "error-input" : ""}`}
            placeholder="Nombre completo"
          />
          {errores.nombre && <p className="error">{errores.nombre}</p>}
        </div>

        {/* Apellido */}
        <div className="form-group">
          <label className="label">Apellido *:</label>
          <input
            name="apellido"
            value={form.apellido}
            onChange={handleChange}
            className={`input ${errores.apellido ? "error-input" : ""}`}
            placeholder="Apellidos"
          />
          {errores.apellido && <p className="error">{errores.apellido}</p>}
        </div>

        {/* Fecha de Nacimiento */}
        <div className="form-group">
          <label className="label">Fecha de Nacimiento *:</label>
          <DatePicker
            selected={form.fechaNacimiento ? new Date(form.fechaNacimiento) : null}
            onChange={(date) => {
              if (date) {
                const formatted = format(date, "yyyy-MM-dd")
                setForm((prev) => ({ ...prev, fechaNacimiento: formatted }))
                if (errores.fechaNacimiento) {
                  setErrores((prev) => ({ ...prev, fechaNacimiento: null }))
                }
              }
            }}
            dateFormat="dd-MM-yyyy"
            placeholderText="Selecciona una fecha"
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            maxDate={MAX_DATE}
            className={`input ${errores.fechaNacimiento ? "error-input" : ""}`}
            wrapperClassName="react-datepicker-wrapper"
          />
          {errores.fechaNacimiento && <p className="error">{errores.fechaNacimiento}</p>}
        </div>

        {/* Escolaridad */}
        <div className="form-group">
          <label className="label">Escolaridad *:</label>
          <select
            name="escolaridad"
            value={form.escolaridad}
            onChange={handleChange}
            className={`input ${errores.escolaridad ? "error-input" : ""}`}
          >
            <option value="">Selecciona un nivel</option>
            {ESCOLARIDADES.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
          {errores.escolaridad && <p className="error">{errores.escolaridad}</p>}
        </div>

        {/* Dirección con Google Maps */}
        <div className="form-group">
          <label className="label">Dirección *:</label>
          <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
            <input
              type="text"
              name="direccion"
              value={form.direccion}
              onChange={handleChange}
              className={`input ${errores.direccion ? "error-input" : ""}`}
              placeholder="Escribe tu dirección"
            />
          </Autocomplete>
          {errores.direccion && <p className="error">{errores.direccion}</p>}
        </div>

        {/* Mapa */}
        {coordenadas && (
          <div className="map-container" style={{ height: "300px", marginBottom: "1rem" }}>
            <GoogleMap center={coordenadas} zoom={16} mapContainerStyle={{ height: "100%", width: "100%" }}>
              <Marker position={coordenadas} />
            </GoogleMap>
          </div>
        )}

        {/* Habilidades */}
        <div className="form-group">
          <label className="label">Habilidades:</label>
          <div className="habilidades-container">
            <input
              value={form.habilidad}
              onChange={(e) => setForm((prev) => ({ ...prev, habilidad: e.target.value }))}
              className="input"
              placeholder="Escribe una habilidad"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  agregarHabilidad()
                }
              }}
            />
            <button type="button" onClick={agregarHabilidad} className="button">
              Agregar
            </button>
          </div>
          {form.habilidades.length > 0 && (
            <ul className="habilidades-list">
              {form.habilidades.map((hab, i) => (
                <li key={i}>
                  {hab}
                  <button
                    type="button"
                    onClick={() => eliminarHabilidad(i)}
                    style={{
                      marginLeft: "10px",
                      background: "red",
                      color: "white",
                      border: "none",
                      borderRadius: "3px",
                      padding: "2px 6px",
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Foto */}
        <div className="form-group">
          <label className="label">Fotografía (JPG/PNG) - Opcional:</label>
          <input type="file" accept="image/jpeg, image/png" onChange={handleFoto} className="input" />
          {errores.foto && <p className="error">{errores.foto}</p>}
          {preview && (
            <div>
              <img src={preview || "/placeholder.svg"} alt="Vista previa" className="preview-image" />
              <button
                type="button"
                onClick={() => {
                  setPreview(null)
                  setForm((prev) => ({ ...prev, foto: null }))
                  const fileInput = document.querySelector('input[type="file"]')
                  if (fileInput) fileInput.value = ""
                }}
                style={{
                  display: "block",
                  marginTop: "10px",
                  background: "red",
                  color: "white",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "5px",
                }}
              >
                Eliminar foto
              </button>
            </div>
          )}
        </div>

        {/* Enviar */}
        <button type="submit" disabled={subiendo} className="button">
          {subiendo ? "Guardando..." : "Guardar Usuario"}
        </button>

        {/* Información de campos requeridos */}
        <p style={{ marginTop: "10px", fontSize: "14px", color: "#666" }}>* Campos obligatorios</p>
      </form>
    </div>
  )
}

export default FormularioUsuario
