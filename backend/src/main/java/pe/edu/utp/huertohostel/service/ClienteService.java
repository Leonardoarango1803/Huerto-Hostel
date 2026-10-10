package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import pe.edu.utp.huertohostel.entity.Cliente;
import pe.edu.utp.huertohostel.entity.EstadoEstadia;
import pe.edu.utp.huertohostel.repository.ClienteRepository;
import pe.edu.utp.huertohostel.repository.EstadiaRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final EstadiaRepository estadiaRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.decolecta.api-key}")
    private String decolectaApiKey;

    @Value("${app.decolecta.base-url}")
    private String decolectaBaseUrl;

    public ClienteService(ClienteRepository clienteRepository, EstadiaRepository estadiaRepository) {
        this.clienteRepository = clienteRepository;
        this.estadiaRepository = estadiaRepository;
    }

    public List<Cliente> listarTodos() {
        return clienteRepository.findAll();
    }

    public Cliente obtenerPorId(@NonNull Integer id) {
        return clienteRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Cliente no encontrado con id: " + id));
    }

    public Cliente buscarPorDocumento(String documento) {
        return clienteRepository.findByNumeroDocumento(documento)
                .orElseThrow(() -> new EntityNotFoundException("Cliente no encontrado con documento: " + documento));
    }

    @Transactional
    public Cliente registrar(Cliente cliente) {
        if (clienteRepository.existsByNumeroDocumento(cliente.getNumeroDocumento())) {
            throw new IllegalStateException("Ya existe un cliente con el documento: " + cliente.getNumeroDocumento());
        }
        return clienteRepository.save(cliente);
    }

    public Map<String, Long> estadisticas() {
        long totalClientes = clienteRepository.count();
        long enCasaHoy = estadiaRepository.findByEstadoEstadia(EstadoEstadia.EN_CURSO).size();
        long frecuentes = clienteRepository.findAll().stream()
                .filter(c -> estadiaRepository.findAll().stream()
                        .filter(e -> e.getReserva().getCliente().getIdCliente().equals(c.getIdCliente())
                                && e.getEstadoEstadia() == EstadoEstadia.FINALIZADA)
                        .count() > 1)
                .count();
        Map<String, Long> result = new HashMap<>();
        result.put("totalClientes", totalClientes);
        result.put("enCasaHoy", enCasaHoy);
        result.put("frecuentes", frecuentes);
        return result;
    }

    public Map<String, String> consultarDni(String dni) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + decolectaApiKey);
        headers.set("Content-Type", "application/json");
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        String url = decolectaBaseUrl + "/v1/reniec/dni?numero=" + dni;
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, HttpMethod.GET, entity, new ParameterizedTypeReference<Map<String, Object>>() {});
        Map<String, String> result = new HashMap<>();
        Map<String, Object> body = response.getBody();
        if (body != null) {
            body.forEach((k, v) -> result.put(k, v != null ? v.toString() : ""));
        }
        return result;
    }

    public Map<String, String> consultarRuc(String ruc) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + decolectaApiKey);
        headers.set("Content-Type", "application/json");
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        String url = decolectaBaseUrl + "/v1/sunat/ruc?numero=" + ruc;
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, HttpMethod.GET, entity, new ParameterizedTypeReference<Map<String, Object>>() {});
        Map<String, String> result = new HashMap<>();
        Map<String, Object> body = response.getBody();
        if (body != null) {
            body.forEach((k, v) -> result.put(k, v != null ? v.toString() : ""));
        }
        return result;
    }

    @Transactional
    public Cliente actualizar(@NonNull Integer id, Cliente datos) {
        Cliente cliente = obtenerPorId(id);
        cliente.setNombres(datos.getNombres());
        cliente.setApellidos(datos.getApellidos());
        cliente.setNumeroDocumento(datos.getNumeroDocumento());
        cliente.setTipoDocumento(datos.getTipoDocumento());
        cliente.setTelefono(datos.getTelefono());
        cliente.setCorreo(datos.getCorreo());
        return clienteRepository.save(cliente);
    }
}
