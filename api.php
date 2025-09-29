<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Configuración de la base de datos

$host = 'localhost';
$dbname = 'piratafi_torneo_familiar';
$username = 'piratafi_sanchez';
$password = '(cc,PJ1GgroI?{a9';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión: ' . $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

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
    global $pdo;
    
    $type = $_GET['type'] ?? '';
    $search = $_GET['search'] ?? '';
    $sort = $_GET['sort'] ?? 'newest';
    
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
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $stories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Formatear fechas
        foreach ($stories as &$story) {
            $date = new DateTime($story['created_at']);
            $story['date'] = $date->format('j F Y');
            $story['timestamp'] = strtotime($story['created_at']);
        }
        
        echo json_encode($stories);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al obtener historias: ' . $e->getMessage()]);
    }
}

function addStory() {
    global $pdo;
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!validateStoryData($data)) {
        http_response_code(400);
        echo json_encode(['error' => 'Datos inválidos']);
        return;
    }
    
    $sql = "INSERT INTO cotton_stories (name, email, location, story_type, story, share, ip_address) 
            VALUES (?, ?, ?, ?, ?, ?, ?)";
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['name'],
            $data['email'],
            $data['location'] ?? '',
            $data['storyType'],
            $data['story'],
            $data['share'],
            $_SERVER['REMOTE_ADDR']
        ]);
        
        $storyId = $pdo->lastInsertId();
        
        // Devolver la historia creada
        $response = [
            'id' => $storyId,
            'name' => $data['name'],
            'email' => $data['email'],
            'location' => $data['location'] ?? '',
            'storyType' => $data['storyType'],
            'story' => $data['story'],
            'share' => $data['share'],
            'date' => date('j F Y'),
            'timestamp' => time()
        ];
        
        echo json_encode($response);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al guardar historia: ' . $e->getMessage()]);
    }
}

function deleteStory() {
    global $pdo;
    
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? null;
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID requerido']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM cotton_stories WHERE id = ?");
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Historia no encontrada']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al eliminar historia: ' . $e->getMessage()]);
    }
}

function validateStoryData($data) {
    return isset(
        $data['name'],
        $data['email'], 
        $data['storyType'],
        $data['story'],
        $data['share']
    ) && strlen($data['story']) >= 50;
}
?>
