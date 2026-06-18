package com.pbs.BudomexWebApp;

import com.pbs.BudomexWebApp.entity.Order;
import com.pbs.BudomexWebApp.entity.OrderStatus;
import com.pbs.BudomexWebApp.repository.OrderRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

@SpringBootTest
public class GetTokensTest {

    @Autowired
    private OrderRepository orderRepository;

    @Test
    public void printTokens() throws Exception {
        java.io.FileWriter fw = new java.io.FileWriter("tokens.txt");
        fw.write("==================================================\n");
        fw.write("                TOKENS FOR CLIENT                 \n");
        fw.write("==================================================\n");
        List<Order> orders = orderRepository.findAll();
        for (Order o : orders) {
            if (o.getStatus() == OrderStatus.ZAAKCEPTOWANE_PRZEZ_MISTRZA) {
                fw.write("Customer: " + o.getCustomerName() + "\n");
                fw.write("Accept Link: http://localhost:8080/api/order/accept/" + o.getAcceptanceToken() + "\n");
                fw.write("Reject Link: http://localhost:8080/api/order/accept/" + o.getAcceptanceToken() + "/reject\n");
                fw.write("--------------------------------------------------\n");
            }
        }
        fw.close();
    }
}
