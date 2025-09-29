



<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuración de la base de datos - ¡CAMBIAR CON TUS DATOS!

$host = 'localhost';
$dbname = 'piratafi_torneo_familiar';
$username = 'piratafi_sanchez';
$password = '(cc,PJ1GgroI?{a9';
// Log para debugging
$logFile = __DIR__ . '/api-debug.log';
file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] Inicio request: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] Conexión DB exitosa\n", FILE_APPEND);
} catch (PDOException $e) {
    $errorMsg = 'Error de conexión: ' . $e->getMessage();
    file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] $errorMsg\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['error' => $errorMsg]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] Método: $method\n", FILE_APPEND);

switch ($method) {
    case 'GET':
        getStories();
        break;
    case 'POST':
        addStory();
        break;
    case 'DELETE':
        deleteStory();
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
}

function getStories() {
    global $pdo, $logFile;
    
    $type = $_GET['type'] ?? '';
    $search = $_GET['search'] ?? '';
    $sort = $_GET['sort'] ?? 'newest';
    
    file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] GET Params - type: $type, search: $search, sort: $sort\n", FILE_APPEND);
    
    $sql = "SELECT * FROM cotton_stories WHERE share = 'yes'";
    $params = [];
    
    if (!empty($type)) {
        $sql .= " AND story_type = ?";
        $params[] = $type;
    }
    
    if (!empty($search)) {
        $sql .= " AND (name LIKE ? OR story LIKE ? OR location LIKE ?)";
        $searchTerm = "%$search%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    // Ordenar
    switch ($sort) {
        case 'oldest':
            $sql .= " ORDER BY created_at ASC";
            break;
        case 'name':
            $sql .= " ORDER BY name ASC";
            break;
        case 'newest':
        default:
            $sql .= " ORDER BY created_at DESC";
    }
    
    file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] SQL: $sql\n", FILE_APPEND);
    file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] Params: " . json_encode($params) . "\n", FILE_APPEND);
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $stories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] Historias encontradas: " . count($stories) . "\n", FILE_APPEND);
        
        // Formatear fechas
        foreach ($stories as &$story) {
            $date = new DateTime($story['created_at']);
            $story['date'] = $date->format('j F Y');
            $story['timestamp'] = strtotime($story['created_at']);
        }
        
        echo json_encode($stories);
        
    } catch (PDOException $e) {
        $errorMsg = 'Error al obtener historias: ' . $e->getMessage();
        file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] $errorMsg\n", FILE_APPEND);
        http_response_code(500);
        echo json_encode(['error' => $errorMsg]);
    }
}

function addStory() {
    global $pdo, $logFile;
    
    $input = file_get_contents('php://input');
    file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] Raw input: $input\n", FILE_APPEND);
    
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        $errorMsg = 'JSON inválido: ' . json_last_error_msg();
        file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] $errorMsg\n", FILE_APPEND);
        http_response_code(400);
        echo json_encode(['error' => $errorMsg]);
        return;
    }
    
    file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] Datos recibidos: " . json_encode($data) . "\n", FILE_APPEND);
    
    if (!validateStoryData($data)) {
        $errorMsg = 'Datos de historia inválidos';
        file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] $errorMsg\n", FILE_APPEND);
        http_response_code(400);
        echo json_encode(['error' => $errorMsg]);
        return;
    }
    
    $sql = "INSERT INTO cotton_stories (name, email, location, story_type, story, share, ip_address) 
            VALUES (?, ?, ?, ?, ?, ?, ?)";
    
    file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] SQL Insert: $sql\n", FILE_APPEND);
    
    try {
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([
            $data['name'],
            $data['email'],
            $data['location'] ?? '',
            $data['storyType'],
            $data['story'],
            $data['share'],
            $_SERVER['REMOTE_ADDR']
        ]);
        
        if ($result) {
            $storyId = $pdo->lastInsertId();
            file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] Historia guardada ID: $storyId\n", FILE_APPEND);
            
            // Devolver la historia creada
            $response = [
                'id' => (int)$storyId,
                'name' => $data['name'],
                'email' => $data['email'],
                'location' => $data['location'] ?? '',
                'story_type' => $data['storyType'],
                'story' => $data['story'],
                'share' => $data['share'],
                'date' => date('j F Y'),
                'timestamp' => time()
            ];
            
            echo json_encode($response);
            
        } else {
            throw new Exception('Error en execute()');
        }
        
    } catch (PDOException $e) {
        $errorMsg = 'Error al guardar historia: ' . $e->getMessage();
        file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] $errorMsg\n", FILE_APPEND);
        http_response_code(500);
        echo json_encode(['error' => $errorMsg]);
    } catch (Exception $e) {
        $errorMsg = 'Error general: ' . $e->getMessage();
        file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] $errorMsg\n", FILE_APPEND);
        http_response_code(500);
        echo json_encode(['error' => $errorMsg]);
    }
}

function deleteStory() {
    global $pdo, $logFile;
    
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    $id = $data['id'] ?? null;
    
    file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] Delete request - ID: $id\n", FILE_APPEND);
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID requerido']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM cotton_stories WHERE id = ?");
        $result = $stmt->execute([$id]);
        
        file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] Delete result: " . ($result ? 'success' : 'failed') . ", rows: " . $stmt->rowCount() . "\n", FILE_APPEND);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'Historia eliminada']);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Historia no encontrada']);
        }
    } catch (PDOException $e) {
        $errorMsg = 'Error al eliminar historia: ' . $e->getMessage();
        file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] $errorMsg\n", FILE_APPEND);
        http_response_code(500);
        echo json_encode(['error' => $errorMsg]);
    }
}

function validateStoryData($data) {
    $required = ['name', 'email', 'storyType', 'story', 'share'];
    
    foreach ($required as $field) {
        if (!isset($data[$field]) || empty(trim($data[$field]))) {
            return false;
        }
    }
    
    return strlen($data['story']) >= 50;
}
?>


